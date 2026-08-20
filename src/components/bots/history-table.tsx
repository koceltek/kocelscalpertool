import { EmptyState, Panel, PhaseTag } from "@/components/bots/panel";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Trade history for a single bot. No records are fabricated in Phase 2. */
export function HistoryTable({
  columns,
  phaseTag,
  title = "Trade history",
}: {
  columns: string[];
  phaseTag: string;
  title?: string;
}) {
  return (
    <Panel
      title={title}
      description="Every record is scoped to this bot and written by the execution engine."
      action={<PhaseTag>{phaseTag}</PhaseTag>}
    >
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column} className="whitespace-nowrap text-xs uppercase tracking-wider">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody />
        </Table>
      </div>

      <EmptyState
        title="No trades yet."
        message="Trading history will appear here once the execution engine is enabled."
      />

      <p className="text-[11px] text-muted-foreground md:hidden">
        Columns: {columns.join(" · ")}
      </p>
    </Panel>
  );
}
