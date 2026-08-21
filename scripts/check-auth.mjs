// Exercises the authentication flows the way the mobile app does: real sign
// ups, real confirmation emails read out of the local mailbox, real tokens,
// real REST calls under RLS. Nothing here runs as postgres, and nothing skips
// the confirmation step, because those are the two ways a check like this ends
// up proving nothing.
//
// Needs the local stack running with the seed loaded: pnpm db:reset

import { execFileSync } from 'node:child_process';

import { joinSession, splitSession } from '../apps/mobile/src/lib/supabase/session-chunks.ts';

const SEEDED_GUARDIAN = 'andres.cabrera@iesansebastian.edu.co';
const SEEDED_PASSWORD = 'arbolapp2026';

/** The deep links the app registers, mirrored from packages/core. */
const CALLBACK_URL = 'arbolapp://auth/callback';
const RESET_URL = 'arbolapp://reset-password';

/** What expo-secure-store accepts per entry before it starts refusing values. */
const KEYSTORE_VALUE_LIMIT = 2048;

function localStack() {
  // The CLI entry point is run through node rather than through the bin shim,
  // which is a .CMD on Windows and would not spawn.
  const cli = new URL('../node_modules/supabase/dist/supabase.js', import.meta.url);
  const raw = execFileSync(process.execPath, [cli.pathname.slice(1), 'status', '-o', 'json'], {
    encoding: 'utf8',
  });
  return JSON.parse(raw.slice(raw.indexOf('{')));
}

const { API_URL, ANON_KEY, SERVICE_ROLE_KEY, MAILPIT_URL } = localStack();

let failures = 0;

/**
 * Accounts this run creates, removed at the end.
 *
 * The platform never deletes a guardian -- it archives them -- but these are
 * not guardians, they are fixtures, and leaving them behind would make the
 * next suite count one profile too many. The physical delete the domain rule
 * reserves for suppression requests is the right tool for undoing a test.
 */
const createdAccounts = [];

async function removeCreatedAccounts() {
  for (const id of createdAccounts) {
    if (id === undefined) continue;
    await fetch(`${API_URL}/auth/v1/admin/users/${id}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    });
  }
}

function check(title, detail, expectation, actual, passed) {
  const mark = passed ? 'PASS' : 'FAIL';
  if (!passed) failures += 1;
  console.log(`[${mark}] ${title}`);
  console.log(`       request  ${detail}`);
  console.log(`       expected ${expectation}`);
  console.log(`       actual   ${actual}`);
  console.log('');
}

function summarise(result) {
  const body = JSON.stringify(result.payload);
  return `${result.status} ${body.length > 170 ? `${body.slice(0, 170)}...` : body}`;
}

async function call(path, { method = 'POST', body, token, base = 'auth/v1' } = {}) {
  const headers = { apikey: ANON_KEY, 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/${base}/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });

  const text = await response.text();
  let payload;
  try {
    payload = text === '' ? null : JSON.parse(text);
  } catch {
    payload = text;
  }
  return { status: response.status, payload };
}

const rest = (path, options = {}) => call(path, { method: 'GET', base: 'rest/v1', ...options });

/** Pulls the most recent message for an address out of Mailpit. */
async function latestEmailFor(address) {
  const response = await fetch(
    `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}&limit=1`,
  );
  const { messages } = await response.json();
  if (!messages || messages.length === 0) {
    return null;
  }

  const detail = await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`);
  return detail.json();
}

/**
 * The confirmation and recovery mails carry the verify URL. Following it by
 * hand is what the phone does when the guardian taps the link.
 */
function extractVerifyUrl(message) {
  const source = `${message.Text ?? ''} ${message.HTML ?? ''}`;
  const match = source.match(/https?:\/\/[^\s"'<>]*\/auth\/v1\/verify[^\s"'<>]*/);
  return match === null ? null : match[0].replaceAll('&amp;', '&');
}

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now().toString(36)}@iesansebastian.edu.co`;
}

console.log(`API      ${API_URL}`);
console.log(`Mailbox  ${MAILPIT_URL}`);
console.log('');

// ---------------------------------------------------------------------------
// 1. Sign up, confirm by email, sign in, read the profile
// ---------------------------------------------------------------------------

const newGuardian = uniqueEmail('guardian.nuevo');
const FIRST_PASSWORD = 'SembrarEnLaPlata2026';
const FULL_NAME = 'Nohora Esperanza Quintero';
const INSTITUTION = 'I.E. San Sebastián';

const signUp = await call(`signup?redirect_to=${encodeURIComponent(CALLBACK_URL)}`, {
  body: {
    email: newGuardian,
    password: FIRST_PASSWORD,
    data: {
      full_name: FULL_NAME,
      institution: INSTITUTION,
      is_adult_confirmed: true,
      terms_accepted: true,
    },
  },
});

// With confirmations on the answer is the user itself; without them it would be
// a whole session. Reading both keeps the failure legible either way.
const newUserId = signUp.payload?.id ?? signUp.payload?.user?.id;
createdAccounts.push(newUserId);

check(
  'sign up creates an identity that still has to confirm its email',
  `POST /auth/v1/signup ${newGuardian}`,
  'a user and no session, because confirmations are on',
  summarise(signUp),
  signUp.status === 200 && newUserId !== undefined && signUp.payload?.access_token === undefined,
);

// The trigger runs inside the same transaction as the credential, so the
// profile is already there before anybody confirms anything.
const provisioned = await rest(
  `public_users?id=eq.${newUserId}&select=id,full_name,institution,role`,
);

check(
  'the trigger provisioned the guardian profile with the sign up',
  `GET /rest/v1/public_users?id=eq.${newUserId}`,
  'one row carrying the name and institution sent as metadata, role guardian',
  summarise(provisioned),
  provisioned.payload?.length === 1 &&
    provisioned.payload[0].full_name === FULL_NAME &&
    provisioned.payload[0].institution === INSTITUTION &&
    provisioned.payload[0].role === 'guardian',
);

const signInBeforeConfirming = await call('token?grant_type=password', {
  body: { email: newGuardian, password: FIRST_PASSWORD },
});

check(
  'signing in before confirming is refused, and says why',
  `POST /auth/v1/token ${newGuardian}`,
  '400 with error_code email_not_confirmed',
  summarise(signInBeforeConfirming),
  signInBeforeConfirming.status === 400 &&
    signInBeforeConfirming.payload?.error_code === 'email_not_confirmed',
);

const confirmationEmail = await latestEmailFor(newGuardian);
const confirmationUrl = confirmationEmail === null ? null : extractVerifyUrl(confirmationEmail);

check(
  'the confirmation email reached the mailbox with a usable link',
  `GET ${MAILPIT_URL}/api/v1/search?query=to:${newGuardian}`,
  'a message holding an /auth/v1/verify URL',
  confirmationUrl === null
    ? `subject ${confirmationEmail?.Subject ?? 'no message'}`
    : `${confirmationEmail.Subject} -> ${confirmationUrl.slice(0, 80)}...`,
  confirmationUrl !== null,
);

if (confirmationUrl !== null) {
  const confirmation = await fetch(confirmationUrl, { redirect: 'manual' });
  const redirectedTo = confirmation.headers.get('location') ?? '';

  check(
    'following the link confirms the address and returns to the app scheme',
    `GET ${confirmationUrl.slice(0, 65)}...`,
    `a redirect to ${CALLBACK_URL}, which means the deep link is on the allow list`,
    `${confirmation.status} -> ${redirectedTo.slice(0, 95)}`,
    redirectedTo.startsWith(CALLBACK_URL) && !redirectedTo.includes('error'),
  );
}

const signInAfterConfirming = await call('token?grant_type=password', {
  body: { email: newGuardian, password: FIRST_PASSWORD },
});

check(
  'the confirmed guardian can sign in',
  `POST /auth/v1/token ${newGuardian}`,
  '200 with an access token and a refresh token',
  summarise(signInAfterConfirming),
  signInAfterConfirming.status === 200 &&
    typeof signInAfterConfirming.payload?.access_token === 'string' &&
    typeof signInAfterConfirming.payload?.refresh_token === 'string',
);

const guardianToken = signInAfterConfirming.payload?.access_token;

const ownProfile = await rest(
  `user_directory?id=eq.${newUserId}&select=id,full_name,email,role,institution,is_adult_confirmed,terms_accepted_at`,
  { token: guardianToken },
);

check(
  'the profile screen reads its own row, email included, with the right data',
  `GET /rest/v1/user_directory?id=eq.${newUserId}`,
  `one row, role guardian, email ${newGuardian}, is_adult_confirmed true, terms dated`,
  summarise(ownProfile),
  ownProfile.payload?.length === 1 &&
    ownProfile.payload[0].email === newGuardian &&
    ownProfile.payload[0].full_name === FULL_NAME &&
    ownProfile.payload[0].role === 'guardian' &&
    ownProfile.payload[0].is_adult_confirmed === true &&
    ownProfile.payload[0].terms_accepted_at !== null,
);

const rename = await call(`users?id=eq.${newUserId}`, {
  method: 'PATCH',
  base: 'rest/v1',
  body: { full_name: 'Nohora E. Quintero Losada', institution: null },
  token: guardianToken,
});

const renamed = await rest(`user_directory?id=eq.${newUserId}&select=full_name,institution`, {
  token: guardianToken,
});

check(
  'the guardian can edit their own name and institution',
  `PATCH /rest/v1/users?id=eq.${newUserId}`,
  'the profile comes back with the new name and no institution',
  `${rename.status} | ${summarise(renamed)}`,
  rename.status < 300 &&
    renamed.payload?.[0]?.full_name === 'Nohora E. Quintero Losada' &&
    renamed.payload?.[0]?.institution === null,
);

const promotion = await call(`users?id=eq.${newUserId}`, {
  method: 'PATCH',
  base: 'rest/v1',
  body: { role: 'coordinator' },
  token: guardianToken,
});

const roleAfter = await rest(`public_users?id=eq.${newUserId}&select=role`, {
  token: guardianToken,
});

check(
  'a guardian cannot promote themselves to coordinator',
  `PATCH /rest/v1/users?id=eq.${newUserId} with role coordinator`,
  'the update policy pins the role to the stored one, so the row stays guardian',
  `${promotion.status} | ${summarise(roleAfter)}`,
  roleAfter.payload?.[0]?.role === 'guardian',
);

// ---------------------------------------------------------------------------
// 2. A sign up without the declaration of legal age
// ---------------------------------------------------------------------------

const undeclaredEmail = uniqueEmail('sin.declaracion');
const signUpWithoutDeclaration = await call('signup', {
  body: {
    email: undeclaredEmail,
    password: FIRST_PASSWORD,
    data: { full_name: 'Sin Declaracion', is_adult_confirmed: false, terms_accepted: false },
  },
});

const undeclaredId =
  signUpWithoutDeclaration.payload?.id ?? signUpWithoutDeclaration.payload?.user?.id;
createdAccounts.push(undeclaredId);
const orphanProfile = await rest(`public_users?id=eq.${undeclaredId}&select=id`);

check(
  'a sign up that does not declare legal age gets no guardian profile',
  'POST /auth/v1/signup with is_adult_confirmed false, then GET /rest/v1/public_users',
  'no profile row, so the account cannot act as a guardian',
  summarise(orphanProfile),
  Array.isArray(orphanProfile.payload) && orphanProfile.payload.length === 0,
);

// The form is the first gate and refuses to submit at all. This is the second
// one, in the database, for anything that ever gets past the form.
const forcedProfile = await call('users', {
  base: 'rest/v1',
  body: {
    id: undeclaredId,
    full_name: 'Forzado',
    email: uniqueEmail('forzado'),
    is_adult_confirmed: false,
    terms_accepted_at: new Date().toISOString(),
  },
  token: guardianToken,
});

check(
  'the database refuses a profile written without the declaration',
  'POST /rest/v1/users with is_adult_confirmed false',
  'rejected, so no profile can exist without the declaration of legal age',
  summarise(forcedProfile),
  forcedProfile.status >= 400,
);

// ---------------------------------------------------------------------------
// 3. RLS from the client: no guardian reads another guardian's email
// ---------------------------------------------------------------------------

const seededSignIn = await call('token?grant_type=password', {
  body: { email: SEEDED_GUARDIAN, password: SEEDED_PASSWORD },
});
const seededId = seededSignIn.payload?.user?.id;

const otherThroughDirectory = await rest(
  `user_directory?id=eq.${seededId}&select=id,full_name,email`,
  { token: guardianToken },
);

check(
  "a guardian cannot read another guardian's email through user_directory",
  `GET /rest/v1/user_directory?id=eq.${seededId} as the new guardian`,
  'zero rows: the view returns the caller only, and everyone only to a coordinator',
  summarise(otherThroughDirectory),
  Array.isArray(otherThroughDirectory.payload) && otherThroughDirectory.payload.length === 0,
);

const otherThroughTable = await rest(`users?id=eq.${seededId}&select=id,email`, {
  token: guardianToken,
});

check(
  'asking the users table for the email column is refused outright',
  'GET /rest/v1/users?select=id,email as the new guardian',
  'permission denied (42501): authenticated holds no privilege on that column',
  summarise(otherThroughTable),
  otherThroughTable.status >= 400 && otherThroughTable.payload?.code === '42501',
);

const ownEmailThroughTable = await rest(`users?id=eq.${newUserId}&select=id,email`, {
  token: guardianToken,
});

check(
  'not even a guardian can read their own email off the table, only off the view',
  `GET /rest/v1/users?id=eq.${newUserId}&select=id,email`,
  'permission denied: the column is out of reach whoever asks, which is the hard stop',
  summarise(ownEmailThroughTable),
  ownEmailThroughTable.status >= 400 && ownEmailThroughTable.payload?.code === '42501',
);

const otherPublicly = await rest(`public_users?id=eq.${seededId}&select=id,full_name`, {
  token: guardianToken,
});

check(
  'the public projection of another guardian is readable and carries no email',
  `GET /rest/v1/public_users?id=eq.${seededId}`,
  'one row with the name and no email field',
  summarise(otherPublicly),
  otherPublicly.payload?.length === 1 && otherPublicly.payload[0].email === undefined,
);

// ---------------------------------------------------------------------------
// 4. Password recovery, end to end
// ---------------------------------------------------------------------------

const RECOVERED_PASSWORD = 'ManzanoDeLaVereda2026';

const recoveryRequest = await call(`recover?redirect_to=${encodeURIComponent(RESET_URL)}`, {
  body: { email: newGuardian },
});

check(
  'asking for a recovery link is accepted without confirming the account exists',
  `POST /auth/v1/recover ${newGuardian}`,
  '200 with an empty body, so the form cannot be used to enumerate accounts',
  summarise(recoveryRequest),
  recoveryRequest.status === 200,
);

const recoveryEmail = await latestEmailFor(newGuardian);
const recoveryUrl = recoveryEmail === null ? null : extractVerifyUrl(recoveryEmail);
const recoveryRedirect =
  recoveryUrl === null ? null : new URL(recoveryUrl).searchParams.get('redirect_to');

check(
  'the recovery email arrived and its link returns to the app, not to the web panel',
  `GET ${MAILPIT_URL}/api/v1/search?query=to:${newGuardian}`,
  `an /auth/v1/verify link of type recovery pointing back at ${RESET_URL}`,
  recoveryUrl === null
    ? 'no link found'
    : `${recoveryEmail.Subject} | type=${new URL(recoveryUrl).searchParams.get('type')} redirect_to=${recoveryRedirect}`,
  recoveryUrl !== null &&
    new URL(recoveryUrl).searchParams.get('type') === 'recovery' &&
    recoveryRedirect === RESET_URL,
);

// What the phone does once it is back in the app: turn the recovery token into
// the short lived session that exists only so the password can be replaced.
// The value in the link is the hashed token, so it goes in `token_hash`;
// `token` is for the six digit code of the other delivery method.
const recoveryVerify =
  recoveryUrl === null
    ? null
    : await call('verify', {
        body: {
          type: 'recovery',
          token_hash: new URL(recoveryUrl).searchParams.get('token'),
        },
      });

const recoveryToken = recoveryVerify?.payload?.access_token ?? null;

check(
  'the recovery token opens a session able to change the password',
  'POST /auth/v1/verify type=recovery',
  'an access token for the recovery session',
  recoveryVerify === null ? 'no link to verify' : summarise(recoveryVerify),
  typeof recoveryToken === 'string',
);

if (recoveryToken !== null) {
  const passwordChange = await call('user', {
    method: 'PUT',
    body: { password: RECOVERED_PASSWORD },
    token: recoveryToken,
  });

  check(
    'the new password is accepted',
    'PUT /auth/v1/user with the recovery session',
    '200 with the updated user',
    summarise(passwordChange),
    passwordChange.status === 200,
  );

  const signInWithNew = await call('token?grant_type=password', {
    body: { email: newGuardian, password: RECOVERED_PASSWORD },
  });

  check(
    'the guardian signs in with the recovered password',
    `POST /auth/v1/token ${newGuardian}`,
    '200 with an access token',
    summarise(signInWithNew),
    signInWithNew.status === 200 && typeof signInWithNew.payload?.access_token === 'string',
  );

  const signInWithOld = await call('token?grant_type=password', {
    body: { email: newGuardian, password: FIRST_PASSWORD },
  });

  check(
    'the old password stops working',
    `POST /auth/v1/token ${newGuardian} with the previous password`,
    '400 with error_code invalid_credentials',
    summarise(signInWithOld),
    signInWithOld.status === 400 && signInWithOld.payload?.error_code === 'invalid_credentials',
  );

  // -------------------------------------------------------------------------
  // 5. Session persistence: what reopening the app has to be able to do
  // -------------------------------------------------------------------------

  const restored = await call('token?grant_type=refresh_token', {
    body: { refresh_token: signInWithNew.payload?.refresh_token },
  });

  check(
    'a session read back from storage still works, which is what reopening the app does',
    'POST /auth/v1/token grant_type=refresh_token with the stored token',
    '200 with a fresh access token and no second sign in',
    summarise(restored),
    restored.status === 200 && typeof restored.payload?.access_token === 'string',
  );

  const wholeSession = JSON.stringify({
    access_token: restored.payload?.access_token,
    refresh_token: restored.payload?.refresh_token,
    expires_at: restored.payload?.expires_at,
    user: restored.payload?.user,
  });

  const chunks = splitSession(wholeSession);
  const longest = Math.max(...chunks.map((chunk) => Buffer.byteLength(chunk, 'utf8')));

  check(
    'the session is split into pieces the keystore will accept',
    `splitSession over a real session of ${Buffer.byteLength(wholeSession, 'utf8')} bytes`,
    `every piece under ${KEYSTORE_VALUE_LIMIT} bytes, where SecureStore starts refusing values`,
    `${chunks.length} pieces, longest ${longest} bytes`,
    longest < KEYSTORE_VALUE_LIMIT,
  );

  check(
    'the pieces rejoin into exactly the session that was stored',
    'joinSession(splitSession(session))',
    'identical to the original, accents and all',
    joinSession(chunks) === wholeSession ? 'identical' : 'differs',
    joinSession(chunks) === wholeSession,
  );
}

// ---------------------------------------------------------------------------
// 6. Errors the screens have to tell apart
// ---------------------------------------------------------------------------

const wrongPassword = await call('token?grant_type=password', {
  body: { email: newGuardian, password: 'noEsLaContrasena123' },
});

check(
  'a wrong password is reported as such and not as a generic failure',
  `POST /auth/v1/token ${newGuardian} with a wrong password`,
  'error_code invalid_credentials, which the app maps to its own message',
  summarise(wrongPassword),
  wrongPassword.payload?.error_code === 'invalid_credentials',
);

const shortPassword = await call('signup', {
  body: {
    email: uniqueEmail('corta'),
    password: 'corta',
    data: { full_name: 'Contrasena Corta', is_adult_confirmed: true, terms_accepted: true },
  },
});

check(
  'a password under the minimum is refused with its own code',
  'POST /auth/v1/signup with a five character password',
  'error_code weak_password, matching MIN_PASSWORD_LENGTH in packages/core',
  summarise(shortPassword),
  shortPassword.payload?.error_code === 'weak_password',
);

await removeCreatedAccounts();

console.log(failures === 0 ? 'All authentication checks passed.' : `${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
