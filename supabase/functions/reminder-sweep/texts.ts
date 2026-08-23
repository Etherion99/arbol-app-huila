/**
 * Every word a guardian reads on a notification.
 *
 * Copy never lives inside the sending logic, for the same reason it never
 * lives inside a component: this is the one surface of the platform that
 * arrives uninvited, on a lock screen, and it has to be reviewable as writing
 * without anyone reading the batching code around it.
 *
 * Spanish, addressing the reader as "tú" or impersonally. Never voseo.
 *
 * ## The tone of the escalation
 *
 * The first message is the product's own, fixed word for word. The three that
 * follow are the difficult ones: they are what a guardian hears when they have
 * already not answered. They are written as company rather than as collection
 * -- no counting of how late it is, no "recuerda que te comprometiste", no
 * scolding. A guardian who is three weeks behind knows they are behind. What
 * they need is a way back in that does not cost them anything to accept.
 */

/** The step of the escalation a message belongs to. */
export type ReminderKind = 'cycle' | 'follow_up_7d' | 'follow_up_21d' | 'overdue';

/** Name of the Android channel these land on, declared by the app. */
export const REMINDER_CHANNEL_ID = 'growth-log-reminders';

/**
 * The message for one tree, by step.
 *
 * The first is fixed by the product and is reproduced exactly.
 */
const singleTree: Record<ReminderKind, (species: string) => { title: string; body: string }> = {
  cycle: (species) => ({
    title: `Tu ${species} espera su foto`,
    body: '¡Es hora de ver cuánto ha crecido tu árbol! Sube una nueva fotografía para actualizar la bitácora de crecimiento de tu frutal.',
  }),
  follow_up_7d: (species) => ({
    title: `Tu ${species} sigue esperando`,
    body: 'Cuando puedas pasar por él, una foto basta para dejar la bitácora al día. Toma menos de un minuto.',
  }),
  follow_up_21d: (species) => ({
    title: `¿Cómo va tu ${species}?`,
    body: 'Nos gustaría saber cómo está. Si algo pasó con el árbol, también puedes contarlo desde la app.',
  }),
  overdue: (species) => ({
    title: `Tu ${species} lleva un mes sin foto`,
    body: 'La bitácora te espera cuando puedas. Si el árbol ya no está o necesitas ayuda, la coordinación del PRAE puede acompañarte.',
  }),
};

/**
 * The message when several trees fall due at once.
 *
 * A guardian with ten overdue trees gets one notification, so the copy has to
 * carry the number without turning it into a reproach. It names how many and
 * says the app has the list, instead of naming ten species the lock screen
 * would truncate anyway.
 */
const manyTrees: Record<ReminderKind, (count: number) => { title: string; body: string }> = {
  cycle: (count) => ({
    title: `${count} de tus árboles esperan su foto`,
    body: '¡Es hora de ver cuánto han crecido! Sube una nueva fotografía de cada uno para actualizar su bitácora de crecimiento.',
  }),
  follow_up_7d: (count) => ({
    title: `${count} de tus árboles siguen esperando`,
    body: 'Puedes ir de a uno, sin apuro. La app te muestra cuáles faltan y guarda lo que vayas subiendo.',
  }),
  follow_up_21d: (count) => ({
    title: `¿Cómo van tus ${count} árboles?`,
    body: 'Nos gustaría saber cómo están. Si algo pasó con alguno, también puedes contarlo desde la app.',
  }),
  overdue: (count) => ({
    title: `${count} de tus árboles llevan un mes sin foto`,
    body: 'Sus bitácoras te esperan cuando puedas. Si necesitas ayuda con alguno, la coordinación del PRAE puede acompañarte.',
  }),
};

/** Builds what one guardian reads, whether they owe one tree or ten. */
export function reminderMessage(
  kind: ReminderKind,
  species: string,
  treeCount: number,
): { title: string; body: string } {
  return treeCount === 1 ? singleTree[kind](species) : manyTrees[kind](treeCount);
}

/**
 * The copy that reaches the coordinator on the day 21 step.
 *
 * A different voice on purpose: this one is a work list, not a nudge. It names
 * the guardian because the coordinator's next action is to call them.
 */
export function coordinatorNotice(
  guardianCount: number,
  treeCount: number,
  firstGuardian: string,
): { title: string; body: string } {
  if (guardianCount === 1) {
    return {
      title: 'Un guardián lleva tres semanas sin actualizar',
      body:
        treeCount === 1
          ? `${firstGuardian} tiene 1 árbol sin foto desde hace 21 días.`
          : `${firstGuardian} tiene ${treeCount} árboles sin foto desde hace 21 días.`,
    };
  }

  return {
    title: `${guardianCount} guardianes llevan tres semanas sin actualizar`,
    body: `Entre ellos suman ${treeCount} árboles sin foto desde hace 21 días. Revisa el panel para ver quiénes son.`,
  };
}
