import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import Select, { GroupBase } from 'react-select';
import { NumericFormat } from 'react-number-format';
import * as yup from 'yup';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import moment from 'moment/moment';
import { OptionNumberType, TradeKindProperties } from '../../common/RendererModel';
import 'react-datepicker/dist/react-datepicker.css';
import darkThemeStyles from '../../common/RendererConstant';
import AccountMapper from '../../mapper/AccountMapper';
import StockMapper from '../../mapper/StockMapper';
import { Currency, IPC_CHANNEL, TradeKind } from '../../../common/CommonType';
import { TradeForm } from '../../../common/ReqModel';
import { ResTradeModel } from '../../../common/ResModel';
import StockBuyMapper from '../../mapper/StockBuyMapper';

export interface TradeModalHandle {
  openTradeModal: (type: TradeKind, tradeSeq: number, selectDate: Date | null) => void;
  hideTradeModal: () => void;
}

export interface TradeModalPropsMethods {
  onSubmit: () => void;
}

const TradeModal = forwardRef<TradeModalHandle, TradeModalPropsMethods>((props, ref) => {
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState<TradeKind>(TradeKind.BUY);
  const [currency, setCurrency] = useState<Currency>(Currency.KRW);

  const createValidationSchema = () => {
    const schemaFields: any = {
      tradeDate: yup.string().required('날짜는 필수입니다.'),
      categorySeq: yup.number().test('is-not-zero', '분류를 선택해 주세요.', (value) => value !== 0),
      accountSeq: yup.number().test('is-not-zero', '계좌를 선택해 주세요.', (value) => value !== 0),
      stockSeq: yup.number().test('is-not-zero', '종목을 선택해 주세요.', (value) => value !== 0),
      note: yup.string().required('메모는 필수입니다.'),
      kind: yup.mixed().oneOf(Object.values(TradeKind), '유효한 유형이 아닙니다').required('유형은 필수입니다.'),
      quantity: yup
        .number()
        .test('is-not-zero', '수량을 입력해 주세요.', (value) => value !== 0)
        .required('수량은 필수입니다.'),
      price: yup
        .number()
        .test('is-not-zero', '단가를 입력해 주세요.', (value) => value !== 0)
        .required('단가는 필수입니다.'),
      tax: yup.number().required('세금은 필수입니다.'),
      fee: yup.number().required('수수료는 필수입니다.'),
    };
    return yup.object().shape(schemaFields);
  };

  const validationSchema = createValidationSchema();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
    setValue,
    setFocus,
    watch,
  } = useForm<TradeForm>({
    // @ts-ignore
    resolver: yupResolver(validationSchema),
    mode: 'onBlur',
  });

  const tradeSeq = watch('tradeSeq');
  const stockSeq = watch('stockSeq');
  const accountSeq = watch('accountSeq');

  useImperativeHandle(ref, () => ({
    openTradeModal: (kind: TradeKind, tradeSeq: number, selectDate: Date | null) => {
      setShowModal(true);

      reset({
        tradeSeq: 0,
        tradeDate: selectDate === null ? new Date() : selectDate,
        accountSeq: 0,
        stockSeq: 0,
        note: '',
        kind,
        quantity: 0,
        price: 0,
        tax: 0,
        fee: 0,
      });
      setType(kind);

      if (tradeSeq !== 0) {
        window.electron.ipcRenderer.once(IPC_CHANNEL.CallTradeGet, (response: any) => {
          const tradeModel = response as ResTradeModel;
          reset({
            ...tradeModel,
            tradeDate: moment(tradeModel.tradeDate).toDate(),
          });
          setType(tradeModel.kind);
        });
        window.electron.ipcRenderer.sendMessage(IPC_CHANNEL.CallTradeGet, tradeSeq);
      }
    },
    hideTradeModal: () => setShowModal(false),
  }));

  const changeTradeDate = (diff: number) => {
    const currentDate = getValues('tradeDate');
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + diff);
    setValue('tradeDate', newDate);
  };

  const onSubmit = (data: TradeForm) => {
    const channel = data.tradeSeq === 0 ? IPC_CHANNEL.CallTradeSave : IPC_CHANNEL.CallTradeUpdate;
    window.electron.ipcRenderer.once(channel, () => {
      StockBuyMapper.loadBuyList(() => {
        AccountMapper.loadList(() => {
          props.onSubmit();
          setShowModal(false);
        });
      });
    });
    window.electron.ipcRenderer.sendMessage(channel, data);
  };

  const handleConfirmClick = () => {
    handleSubmit(onSubmit)();
  };

  useEffect(() => {
    if (showModal) {
      setFocus('note');
    }
  }, [setFocus, showModal]);

  useEffect(() => {
    if (stockSeq && stockSeq !== 0) {
      const stock = StockMapper.getStock(stockSeq);
      setCurrency(stock.currency);
    }
  }, [stockSeq]);

  return (
    <Modal size="lg" show={showModal} onHide={() => setShowModal(false)} centered data-bs-theme="dark">
      <Modal.Header closeButton className="bg-dark text-white-50">
        <Modal.Title>
          주식 {TradeKindProperties[type].label} {tradeSeq === 0 ? '등록' : '수정'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-dark text-white-50">
        <Row>
          <Col>
            <Form>
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  날짜
                </Form.Label>
                <Col sm={9}>
                  <Row>
                    <Col sm={7}>
                      <div className="form-group">
                        <Controller
                          control={control}
                          name="tradeDate"
                          render={({ field }) => (
                            <DatePicker dateFormat="yyyy-MM-dd" onChange={field.onChange} selected={field.value} className="form-control" />
                          )}
                        />
                        {errors.tradeDate && (
                          <span className="error" style={{ display: 'block' }}>
                            {errors.tradeDate.message}
                          </span>
                        )}
                      </div>
                    </Col>
                    <Col>
                      <Button variant="outline-success" onClick={() => changeTradeDate(-1)}>
                        전날
                      </Button>
                      <Button variant="outline-success" style={{ marginLeft: '5px' }} onClick={() => changeTradeDate(1)}>
                        다음날
                      </Button>
                    </Col>
                  </Row>
                </Col>
              </Form.Group>
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  메모
                </Form.Label>
                <Col sm={9}>
                  <Form.Control type="text" {...register('note')} maxLength={50} />
                  {errors.note && <span className="error">{errors.note.message}</span>}
                </Col>
              </Form.Group>
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  거래계좌
                </Form.Label>
                <Col sm={9}>
                  <Controller
                    control={control}
                    name="accountSeq"
                    render={({ field }) => (
                      <Select<OptionNumberType, false, GroupBase<OptionNumberType>>
                        value={AccountMapper.getStockOptionList(currency).find((option) => option.value === field.value)}
                        onChange={(option) => field.onChange(option?.value)}
                        options={AccountMapper.getStockOptionList(currency)}
                        placeholder="계좌 선택"
                        className="react-select-container"
                        styles={darkThemeStyles}
                      />
                    )}
                  />
                  {errors.accountSeq && <span className="error">{errors.accountSeq.message}</span>}
                </Col>
              </Form.Group>
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  종목
                </Form.Label>
                <Col sm={9}>
                  <Controller
                    control={control}
                    name="stockSeq"
                    render={({ field }) => (
                      <Select<OptionNumberType, false, GroupBase<OptionNumberType>>
                        value={StockMapper.getOptionBalanceList(accountSeq).find((option) => option.value === field.value)}
                        onChange={(option) => field.onChange(option?.value)}
                        options={StockMapper.getOptionBalanceList(accountSeq)}
                        placeholder="종목 선택"
                        className="react-select-container"
                        styles={darkThemeStyles}
                      />
                    )}
                  />
                  {errors.stockSeq && <span className="error">{errors.stockSeq.message}</span>}
                </Col>
              </Form.Group>
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  수량
                </Form.Label>
                <Col sm={9}>
                  <Controller
                    control={control}
                    name="quantity"
                    render={({ field }) => (
                      <NumericFormat
                        thousandSeparator
                        maxLength={8}
                        value={field.value}
                        onValueChange={(values) => {
                          field.onChange(values.floatValue);
                        }}
                        className="form-control"
                        style={{ textAlign: 'right' }}
                      />
                    )}
                  />
                  {errors.quantity && <span className="error">{errors.quantity.message}</span>}
                </Col>
              </Form.Group>
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  단가
                </Form.Label>
                <Col sm={9}>
                  <Controller
                    control={control}
                    name="price"
                    render={({ field }) => (
                      <NumericFormat
                        thousandSeparator
                        maxLength={8}
                        value={field.value}
                        onValueChange={(values) => {
                          field.onChange(values.floatValue);
                        }}
                        className="form-control"
                        style={{ textAlign: 'right' }}
                      />
                    )}
                  />
                  {errors.price && <span className="error">{errors.price.message}</span>}
                </Col>
              </Form.Group>
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  거래세
                </Form.Label>
                <Col sm={9}>
                  <Controller
                    control={control}
                    name="tax"
                    render={({ field }) => (
                      <NumericFormat
                        thousandSeparator
                        maxLength={8}
                        value={field.value}
                        onValueChange={(values) => {
                          field.onChange(values.floatValue);
                        }}
                        className="form-control"
                        style={{ textAlign: 'right' }}
                      />
                    )}
                  />
                  {errors.tax && <span className="error">{errors.tax.message}</span>}
                </Col>
              </Form.Group>
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  수수료
                </Form.Label>
                <Col sm={9}>
                  <Controller
                    control={control}
                    name="fee"
                    render={({ field }) => (
                      <NumericFormat
                        thousandSeparator
                        maxLength={8}
                        value={field.value}
                        onValueChange={(values) => {
                          field.onChange(values.floatValue);
                        }}
                        className="form-control"
                        style={{ textAlign: 'right' }}
                      />
                    )}
                  />
                  {errors.fee && <span className="error">{errors.fee.message}</span>}
                </Col>
              </Form.Group>
            </Form>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer className="bg-dark text-white-50">
        <Button variant="primary" onClick={handleConfirmClick}>
          저장
        </Button>
        <Button variant="secondary" onClick={() => setShowModal(false)}>
          닫기
        </Button>
      </Modal.Footer>
    </Modal>
  );
});
TradeModal.displayName = 'TradeModal';

export default TradeModal;
