import {useState} from 'react'
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type SortingState,
} from '@tanstack/react-table'
import {ArrowDown, ArrowUp, ArrowUpDown, Search} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {cn} from '@/lib/utils'

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchable?: boolean
}

export function DataTable<TData, TValue>({
    columns,
    data,
    searchable = true,
}: DataTableProps<TData, TValue>) {
    const {t} = useTranslation()
    const [sorting, setSorting] = useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = useState('')

    const table = useReactTable({
        data,
        columns,
        state: {sorting, globalFilter},
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    })

    return (
        <div className="space-y-2">
            {searchable && (
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground"/>
                    <input
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        placeholder={t('resources.search')}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                </div>
            )}
            <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b border-border bg-muted/50">
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="px-3 py-2 text-left font-medium text-muted-foreground"
                                    >
                                        {header.isPlaceholder ? null : (
                                            <button
                                                type="button"
                                                onClick={header.column.getToggleSortingHandler()}
                                                className={cn(
                                                    'inline-flex items-center gap-1',
                                                    header.column.getCanSort() &&
                                                        'cursor-pointer select-none hover:text-foreground'
                                                )}
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {header.column.getCanSort() &&
                                                    (header.column.getIsSorted() === 'asc' ? (
                                                        <ArrowUp className="size-3.5"/>
                                                    ) : header.column.getIsSorted() === 'desc' ? (
                                                        <ArrowDown className="size-3.5"/>
                                                    ) : (
                                                        <ArrowUpDown className="size-3.5 opacity-40"/>
                                                    ))}
                                            </button>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                                >
                                    {t('resources.empty')}
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className="border-b border-border last:border-0 hover:bg-muted/50"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="px-3 py-2">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
