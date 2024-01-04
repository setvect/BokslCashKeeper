import React, { CSSProperties, useMemo, useRef, useState } from 'react';
import { Cell, Column, useSortBy, useTable } from 'react-table';
import { Button, ButtonGroup, Col, Container, Form, Row } from 'react-bootstrap';
import { downloadForTable, printEnable, printExternalLink, renderSortIndicator, showDeleteDialog, toBr } from '../util/util';
import CodeMapper from '../../mapper/CodeMapper';
import StockModal, { StockModalHandle } from './StockModal';
import StockMapper from '../../mapper/StockMapper';
import { ResStockModel } from '../../../common/ResModel';
import { CodeKind, IPC_CHANNEL } from '../../../common/CommonType';

function StockList() {
  const [showEnabledOnly, setShowEnabledOnly] = useState(true);
  const [stockList, setStockList] = useState<ResStockModel[]>(StockMapper.getStockList());
  const stockModalRef = useRef<StockModalHandle>(null);

  const handleAddStockClick = () => {
    if (!stockModalRef.current) {
      return;
    }
    stockModalRef.current.openStockModal(0);
  };

  const handleEditStockClick = (stockSeq: number) => {
    if (!stockModalRef.current) {
      return;
    }
    stockModalRef.current.openStockModal(stockSeq);
  };

  const deleteStockConfirm = (stockSeq: number) => {
    window.electron.ipcRenderer.once(IPC_CHANNEL.CallStockDelete, () => {
      reloadStock();
    });

    window.electron.ipcRenderer.sendMessage(IPC_CHANNEL.CallStockDelete, stockSeq);
    return true;
  };

  const handleDeleteStockClick = (stockSeq: number) => {
    showDeleteDialog(() => deleteStockConfirm(stockSeq));
  };

  const renderActionButtons = (record: ResStockModel) => {
    return (
      <ButtonGroup size="sm">
        <Button onClick={() => handleEditStockClick(record.stockSeq)} className="small-text-button" variant="secondary">
          수정
        </Button>
        <Button onClick={() => handleDeleteStockClick(record.stockSeq)} className="small-text-button" variant="light">
          삭제
        </Button>
      </ButtonGroup>
    );
  };

  const columns: Column<ResStockModel>[] = React.useMemo(
    () => [
      { Header: '종목명', accessor: 'name' },
      { Header: '매매 통화', accessor: 'currency' },
      {
        Header: '종목유형',
        accessor: 'stockTypeCode',
        Cell: ({ value }) => CodeMapper.getCodeValue(CodeKind.STOCK_TYPE, value),
      },
      {
        Header: '상장국가',
        accessor: 'nationCode',
        Cell: ({ value }) => CodeMapper.getCodeValue(CodeKind.NATION_TYPE, value),
      },
      { Header: '상세정보', accessor: 'link', Cell: ({ value }) => printExternalLink('상세정보', value) },
      { Header: '메모', accessor: 'note', Cell: ({ value }) => toBr(value) },
      { Header: '활성', accessor: 'enableF', Cell: ({ value }) => printEnable(value) },
      {
        Header: '기능',
        id: 'actions',
        Cell: ({ row }) => renderActionButtons(row.original),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const filteredData = useMemo(() => {
    return showEnabledOnly ? stockList.filter((stock) => stock.enableF) : stockList;
  }, [stockList, showEnabledOnly]);

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable<ResStockModel>(
    {
      columns,
      data: filteredData,
    },
    useSortBy,
  );
  const renderCell = (cell: Cell<ResStockModel>) => {
    const customStyles: CSSProperties = {};

    if (['enableF', 'actions'].includes(cell.column.id)) {
      customStyles.textAlign = 'center';
    }

    return (
      <td {...cell.getCellProps()} style={customStyles}>
        {cell.render('Cell')}
      </td>
    );
  };

  const reloadStock = () => {
    StockMapper.loadStockList(() => {
      setStockList(StockMapper.getStockList());
    });
  };

  const tableRef = useRef<HTMLTableElement>(null);
  const handleDownloadClick = () => {
    downloadForTable(tableRef, `주식 종목.xls`);
  };

  const handleEnable = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowEnabledOnly(event.target.checked);
  };
  return (
    <Container fluid className="ledger-table">
      <Row className="align-items-center">
        <Col xs="auto" className="ms-auto">
          <Form.Check onChange={handleEnable} checked={showEnabledOnly} type="checkbox" id="account-enable-only" label="활성 계좌만 보기" />
        </Col>
        <Col xs="auto">
          <Button onClick={handleAddStockClick} variant="success" className="me-2">
            종목 등록
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
      <StockModal ref={stockModalRef} onSubmit={() => reloadStock()} />
    </Container>
  );
}

export default StockList;
