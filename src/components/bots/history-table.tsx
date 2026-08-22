import { EmptyState, Panel } from "@/components/bots/panel";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Trade history for a single bot. Records come from that bot's execution engine. */
export function HistoryTable({
  columns,
  title = "Trade history",
  rows = [],
}: {
  columns: string[];
  title?: string;
  rows?: string[][];
}) {
  return (
    <Panel
      title={title}
      description="Every record is scoped to this bot and written by the execution engine."
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
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={`${row[0] ?? "trade"}-${rowIndex}`}>
                {row.map((value, cellIndex) => (
                  <td key={`${cellIndex}-${value}`} className="whitespace-nowrap px-4 py-3 text-sm">
                    {value}
                  </td>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {rows.length === 0 ? <EmptyState title="No trades yet." message="Trading history will appear here once the execution engine records a completed trade." /> : null}

      <p className="text-[11px] text-muted-foreground md:hidden">
        Columns: {columns.join(" · ")}
      </p>
    </Panel>
  );
}
