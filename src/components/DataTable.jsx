import React, { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import { ChevronDown, ChevronUp } from 'lucide-react';

const columnHelper = createColumnHelper();

export function DataTable({ data, onSelectionChange, selectedRows, editingRow, editedData, handleInputChange }) {
  //const [selectedRows, setSelectedRows] = useState(new Set());
  const [expandedHeaders, setExpandedHeaders] = useState(new Set());
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [isEditing, setIsEditing] = useState(false); // Estado para controlar o modo de edição


  // Mapeamento das colunas expansíveis
  const expandableHeaders = {
    "Registro Visa": [
      "Cód GGrem", "Princípio_Ativo", "Laboratório", "CNPJ Lab",
      "Classe Terapêutica", "Tipo do Produto", "Regime Preço",
      "Restrição Hosp", "Cap  ", "Confaz87", "ICMS0", "Lista", "Status"
    ],
    " Tabela ": ["Tabela", "Tabela Classe", "Tabela tipo", "Classe JaraguaSul", "Classificação tipo", "Finalidade", "Objetivo"],
    "Princípio Ativo": ["Princípio_Ativo", "Princípio_Ativo_Classificado", "FaseuGF"],
    "Unidade Fracionamento": ["Unidade_Fracionamento", "Descricao", "Divisor"],
    "Taxas": ["ID Taxa", "tipo taxa", "finalidade", "Tempo infusão"]
  };

  const toggleHeaderExpansion = (header) => {
    setExpandedHeaders((prev) => {
      const newSet = new Set(prev);
      newSet.has(header) ? newSet.delete(header) : newSet.add(header);
      return newSet;
    });
  };

  const handleRowClick = (rowId) => {
    onSelectionChange(rowId); // Notifica o componente pai sobre a linha selecionada
  };

  const toggleRowExpansion = (rowId) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      newSet.has(rowId) ? newSet.delete(rowId) : newSet.add(rowId);
      return newSet;
    });
  };

  const columnOrder = [
    "ID", "Código TUSS", "Registro Visa", " Tabela ", "Via_Administração",
    "Classe_Farmaceutica", "Princípio Ativo", "Armazenamento", "Descricao_Apresentacao",
    "Descricao_Resumida", "Descricao_Comercial", "Medicamento", "Unidade Fracionamento",
    "Fator_Conversão", "Concentracao", "Fracionamento", "Laboratorio", "Taxas", "Revisado"
  ];

  const columns = useMemo(() => {
    let cols = [
      columnHelper.accessor('id', {
        header: 'ID',
        cell: info => info.getValue(),
        size: 80,
        frozen: true,
      }),
      columnHelper.accessor('codigoTUSS', {
        header: 'Código TUSS',
        cell: info => {
          const rowId = info.row.original.id; // Usa o ID real da linha
          const isEditing = editingRow === rowId;
          return isEditing ? (
            <input
              type="text"
              value={editedData.codigoTUSS || ''}
              onChange={(e) => handleInputChange(e, 'codigoTUSS')}
              className="w-full p-1 border rounded"
            />
          ) : (
            info.getValue()
          );
        },
        size: 120,
        frozen: true,
      }),
    ];

    columnOrder.slice(2).forEach((header) => {
      if (expandableHeaders[header]) {
        cols.push({
          header: () => (
            <div
              className="cursor-pointer text-center font-bold flex items-center justify-center gap-2"
              onClick={() => toggleHeaderExpansion(header)}
            >
              <span style={{ color: expandedHeaders.has(header) ? "#f3df90" : "" }}>
                {header}
              </span>
              {expandedHeaders.has(header) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          ),
          accessorKey: header,
          size: 150,
          cell: info => {
            const rowId = info.row.original.id;
            const isEditing = editingRow === rowId;
            return isEditing ? (
              <input
                type="text"
                value={editedData[header] || ''}
                onChange={(e) => handleInputChange(e, header)}
                className="w-full p-1 border rounded"
              />
            ) : (
              <div onClick={() => toggleRowExpansion(info.row.id)} className="cursor-pointer">
                <div>{expandedRows.has(info.row.id) ? info.getValue() : '...'}</div>
                {expandedRows.has(info.row.id) && (
                  <div className="mt-2 pl-4 border-l-2 border-primary-light">
                    <div className="mb-2">
                    <div className="font-medium text-sm"></div>
                      <div>{info.row.original[header]}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          },
        });

        if (expandedHeaders.has(header)) {
          expandableHeaders[header].forEach((sub) => {
            cols.push({
              header: sub,
              accessorKey: sub,
              size: 120,
              cell: info => {
                const rowId = info.row.original.id;
                const isEditing = editingRow === rowId;
                return isEditing ? (
                  <input
                    type="text"
                    value={editedData[sub] || ''}
                    onChange={(e) => handleInputChange(e, sub)}
                    className="w-full p-1 border rounded"
                  />
                ) : (
                  info.getValue()
                );
              },
            });
          });
        }
      } else {
        cols.push({
          header: header,
          accessorKey: header.replace(/ /g, '_'),
          size: 120,
          cell: info => {
            const rowId = info.row.original.id;
            const isEditing = editingRow === rowId;
            return isEditing ? (
              <input
                type="text"
                value={editedData[header.replace(/ /g, '_')] || ''}
                onChange={(e) => handleInputChange(e, header.replace(/ /g, '_'))}
                className="w-full p-1 border rounded"
              />
            ) : (
              info.getValue()
            );
          },
        });
      }
    });

    return cols;
  }, [expandedHeaders, expandedRows, editingRow, editedData, handleInputChange]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="table-container data-table-container" style={{ overflowX: 'auto', maxWidth: '100%', whiteSpace: 'nowrap' }}>
      <table className="table-auto w-full data-table border-collapse">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className="border px-4 py-2 text-center"
                  style={{ width: header.column.columnDef.size, minWidth: header.column.columnDef.size }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => {
            const adjustedRowId = Number(row.id); // Converte row.id para número e soma 1
            const rowId = row.original.id;
            const isSelected = selectedRows.has(rowId);
            return (
              <tr
                key={row.id}
                onClick={() => handleRowClick(rowId)}
                className={`cursor-pointer-aqui ${isSelected ? '' : 'hover:bg-gray-300'}`}
                style={{
                  backgroundColor: isSelected ? '#E8E351' : undefined,
                }}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="border px-4 py-2 text-center">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
