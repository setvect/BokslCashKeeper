import React, { CSSProperties, useCallback, useEffect, useRef } from 'react';
import { Cell, Column, useSortBy, useTable } from 'react-table';
import { Button, ButtonGroup, Col, Container, Row } from 'react-bootstrap';
import { convertToComma, downloadForTable, printColorAmount, printColorPercentage, renderSortIndicator, showDeleteDialog } from '../util/util';
import SnapshotReadModal, { SnapshotReadModelHandle } from './SnapshotReadModel';
import { ResPageModel, ResSnapshotModel } from '../../../common/ResModel';
import IpcCaller from '../../common/IpcCaller';
import SnapshotModal, { SnapshotModelHandle } from './SnapshotModel';
import SnapshotHelper from './SnapshotHelper';

function SnapshotList() {
  const snapshotModalRef = useRef<SnapshotModelHandle>(null);
  const snapshotReadModalRef = useRef<SnapshotReadModelHandle>(null);
  const [snapshotPage, setSnapshotPage] = React.useState<ResPageModel<ResSnapshotModel>>({
    list: [],
    total: 0,
  });
  const [page, setPage] = React.useState<number>(1);

  const handleAddStockClick = () => {
    if (!snapshotModalRef.current) {
      return;
    }
    snapshotModalRef.current.openSnapshotModal(0);
  };

  const handleEditStockClick = (stockSeq: number) => {
    if (!snapshotModalRef.current) {
      return;
    }
    snapshotModalRef.current.openSnapshotModal(stockSeq);
  };

  const deleteStock = (stockSeq: number) => {
    console.log(`${stockSeq}삭제`);
  };

  const handleDeleteClick = (stockSeq: number) => {
    showDeleteDialog(() => deleteStock(stockSeq));
  };

  const renderActionButtons = (resSnapshotModel: ResSnapshotModel) => {
    return (
      <ButtonGroup size="sm">
        <Button onClick={() => handleEditStockClick(resSnapshotModel.snapshotSeq)} className="small-text-button" variant="secondary">
          수정
        </Button>
        <Button onClick={() => handleDeleteClick(resSnapshotModel.snapshotSeq)} className="small-text-button" variant="light">
          삭제
        </Button>
      </ButtonGroup>
    );
  };

  const printLink = (resSnapshotModel: ResSnapshotModel) => {
    return (
      <Button
        variant="link"
        onClick={() => {
          snapshotReadModalRef.current?.openSnapshotReadModal(resSnapshotModel.snapshotSeq);
        }}
        className="link-button"
      >
        {resSnapshotModel.note}
      </Button>
    );
  };

  const columns: Column<ResSnapshotModel>[] = React.useMemo(
    () => [
      { Header: '설명', id: 'note', Cell: ({ row }) => printLink(row.original) },
      { Header: '합산자산(원)', id: 'totalAmount', Cell: ({ row }) => convertToComma(SnapshotHelper.getTotalAmount(row.original)) },
      { Header: '평가자산(원)', id: 'evaluateAmount', Cell: ({ row }) => convertToComma(SnapshotHelper.getTotalAmount(row.original)) },
      {
        Header: '수익금(원)',
        id: 'profit',
        Cell: ({ row }) => printColorAmount(SnapshotHelper.getProfit(row.original)),
      },
      {
        Header: '수익률(%)',
        id: 'profitRate',
        Cell: ({ row }) => printColorPercentage(SnapshotHelper.getProfitRate(row.original)),
      },
      {
        Header: '주식매도확인일',
        accessor: 'stockSellCheckDate',
        Cell: ({ value }) => value && new Date(value).toLocaleDateString(),
      },
      {
        Header: '매도차익(원)',
        id: 'stockSellProfitLossAmount',
        Cell: ({ row }) => convertToComma(SnapshotHelper.getStockSellProfitLossAmount(row.original)),
      },
      { Header: '등록일', accessor: 'regDate', Cell: ({ value }) => value && new Date(value).toLocaleDateString() },
      {
        Header: '기능',
        id: 'actions',
        Cell: ({ row }) => renderActionButtons(row.original),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const data = React.useMemo<ResSnapshotModel[]>(() => snapshotPage.list, [snapshotPage.list]);

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable<ResSnapshotModel>(
    {
      columns,
      data,
    },
    useSortBy,
  );
  const renderCell = (cell: Cell<ResSnapshotModel>) => {
    const customStyles: CSSProperties = {};

    if (['evaluateAmount', 'totalAmount', 'profit', 'profitRate', 'stockSellProfitLossAmount'].includes(cell.column.id)) {
      customStyles.textAlign = 'right';
    }
    if (['enableF', 'actions'].includes(cell.column.id)) {
      customStyles.textAlign = 'center';
    }

    return (
      <td {...cell.getCellProps()} style={customStyles}>
        {cell.render('Cell')}
      </td>
    );
  };

  const loadPage = useCallback(async () => {
    const snapshotPageModel: ResPageModel<ResSnapshotModel> = await IpcCaller.getSnapshotPage(page);
    setSnapshotPage(snapshotPageModel);
  }, [page]);

  const tableRef = useRef<HTMLTableElement>(null);
  const handleDownloadClick = () => {
    downloadForTable(tableRef, `주식 종목.xls`);
  };

  useEffect(() => {
    (async () => {
      await loadPage();
    })();
  }, [loadPage]);

  return (
    <Container fluid className="ledger-table">
      <Row className="align-items-center" style={{ textAlign: 'right' }}>
        <Col>
          <Button onClick={handleAddStockClick} variant="success" className="me-2">
            자산 스냅샷 등록
          </Button>
          <Button onClick={handleDownloadClick} variant="primary" className="me-2">
            내보내기(엑셀)
          </Button>
        </Col>
      </Row>
      <Row style={{ marginTop: '15px' }}>
        <Col>
          <table
            {...getTableProps()}
            className="table-th-center table-font-size table table-dark table-striped table-bordered table-hover"
            style={{ marginTop: '10px' }}
            ref={tableRef}
          >
            <thead>
              {headerGroups.map((headerGroup) => (
                <tr {...headerGroup.getHeaderGroupProps()}>
                  {headerGroup.headers.map((column) => (
                    <th {...column.getHeaderProps((column as any).getSortByToggleProps())}>
                      {column.render('Header')}
                      <span>{renderSortIndicator(column)}</span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody {...getTableBodyProps()}>
              {rows.map((row) => {
                prepareRow(row);
                return <tr {...row.getRowProps()}>{row.cells.map((cell) => renderCell(cell))}</tr>;
              })}
            </tbody>
          </table>
        </Col>
      </Row>
      <SnapshotModal ref={snapshotModalRef} onSubmit={() => loadPage()} />
      <SnapshotReadModal ref={snapshotReadModalRef} />
    </Container>
  );
}

export default SnapshotList;
