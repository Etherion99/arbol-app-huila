import { Button } from '@/components/ui/button';
import { Card, ScreenTitle } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { texts } from '@/constants/texts';
import type { ReportId } from '@/features/export/reports';

/**
 * D7 · Exportación de reportes PRAE.
 *
 * ## The rule on this screen
 *
 * Every file excludes the guardians' emails, and the intro says so where a
 * coordinator could otherwise assume the opposite. It is not a promise made by
 * this component: the builders read `tree_overview`, `public_users` and the
 * statistics views, and none of those has an email column to leak.
 *
 * ## The Excel button
 *
 * It is disabled, with the reason underneath. Writing an `.xlsx` needs a
 * spreadsheet library, which is a new dependency and needs a justification
 * nobody has made -- the CSV opens in Excel and in LibreOffice, so the
 * dependency would buy formatting rather than access. The button stays visible
 * because the canvas draws it and because hiding it would leave the coordinator
 * wondering whether Excel is coming; a button that looks alive and does nothing
 * would be worse than either.
 *
 * ## The "última exportación" line
 *
 * The canvas ends with "Última exportación: 04 ago 2026 · … · C. Perdomo".
 * Nothing records an export, so there is no date to show and none is invented.
 */
export default function Page() {
  return (
    <>
      <ScreenTitle>{texts.export.title}</ScreenTitle>

      <p className="max-w-[560px] font-sans text-sm leading-relaxed text-text-secondary">
        {texts.export.intro}
      </p>

      <div className="grid max-w-[900px] gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        <ReportCard
          report="inventory"
          title={texts.export.inventoryTitle}
          body={texts.export.inventoryBody}
        />
        <ReportCard
          report="logbook"
          title={texts.export.logbookTitle}
          body={texts.export.logbookBody}
        />
        <ReportCard
          report="indicators"
          title={texts.export.indicatorsTitle}
          body={texts.export.indicatorsBody}
        />
      </div>

      <Notice tone="info" className="max-w-[900px]">
        {texts.export.coordinateLimitNotice}
      </Notice>

      <p className="font-mono text-xs text-text-muted">{texts.export.lastExportUnavailable}</p>
    </>
  );
}

function ReportCard({ report, title, body }: { report: ReportId; title: string; body: string }) {
  return (
    <Card className="flex flex-col gap-2 p-4.5">
      <h2 className="font-subheading text-[15px] font-bold text-text-primary">{title}</h2>
      <p className="flex-1 font-sans text-[13px] leading-relaxed text-text-secondary">{body}</p>

      <div className="flex gap-2">
        {/* A real link, so the browser downloads the file rather than a script
            assembling a blob. `download` names it; the handler also sends a
            Content-Disposition, which is what decides the name across origins. */}
        <Button
          size="sm"
          className="flex-1"
          render={
            <a href={`/api/export/${report}`} download aria-label={texts.export.csvLabel(title)} />
          }
        >
          {texts.export.csv}
        </Button>

        <Button variant="secondary" size="sm" className="flex-1" disabled>
          {texts.export.excel}
        </Button>
      </div>

      <p className="font-sans text-[11px] leading-relaxed text-text-muted">
        {texts.export.excelUnavailable}
      </p>
    </Card>
  );
}
