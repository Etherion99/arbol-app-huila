import { texts } from '@/constants/texts';
import { readPanelSession } from '@/features/auth/session';
import { buildReport, isReportId } from '@/features/export/reports';

/**
 * The download behind the CSV buttons of D7.
 *
 * A route handler rather than a Server Action, because what the coordinator
 * needs is a file with a name -- an action can only return data to a script,
 * and the viewer would then have to build a blob to save it.
 *
 * The role is checked here as well as in the layout. This URL is reachable
 * without ever loading the panel, so the gate that protects the screens does
 * not protect it. Row level security would still refuse a stranger, but a 403
 * saying why beats an empty CSV that looks like a project with no trees.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ report: string }> }) {
  const { report } = await params;

  if (!isReportId(report)) {
    return new Response(texts.states.notAvailableYet, { status: 404 });
  }

  const result = await readPanelSession();

  if (!('session' in result)) {
    return new Response(texts.signIn.denied['not-coordinator'], { status: 403 });
  }

  const file = await buildReport(report);

  if (!file) {
    return new Response(texts.states.loadFailedBody, { status: 502 });
  }

  return new Response(file.csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${file.fileName}"`,
      // The figures change with every log entry, so a cached copy would hand
      // the coordinator yesterday's report without saying so.
      'cache-control': 'no-store',
    },
  });
}
