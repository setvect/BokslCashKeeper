import moment from 'moment';
import { EntityManager } from 'typeorm';
import AppDataSource from '../config/AppDataSource';
import { ExchangeForm } from '../../common/ReqModel';
import { ExchangeEntity } from '../entity/Entity';
import { ResExchangeModel, ResSearchModel } from '../../common/ResModel';
import { escapeWildcards } from '../util';
import AccountService from './AccountService';
import { Currency, ExchangeKind } from '../../common/CommonType';
import ExchangeRepository from '../repository/ExchangeRepository';

export default class ExchangeService {
  private static exchangeRepository = new ExchangeRepository(AppDataSource);

  // eslint-disable-next-line no-useless-constructor
  private constructor() {
    // empty
  }

  private static mapEntityToRes(exchange: ExchangeEntity) {
    return {
      exchangeSeq: exchange.exchangeSeq,
      kind: exchange.sellCurrency === Currency.KRW ? ExchangeKind.SELL : ExchangeKind.BUY,
      sellCurrency: exchange.sellCurrency,
      sellAmount: exchange.sellAmount,
      buyCurrency: exchange.buyCurrency,
      buyAmount: exchange.buyAmount,
      fee: exchange.fee,
      accountSeq: exchange.account.accountSeq,
      exchangeDate: exchange.exchangeDate,
    } as ResExchangeModel;
  }

  static async getExchange(exchangeSeq: number) {
    const exchange = await this.exchangeRepository.repository.findOne({ where: { exchangeSeq } });
    if (!exchange) {
      throw new Error('환전 정보를 찾을 수 없습니다.');
    }
    return this.mapEntityToRes(exchange);
  }

  static async findExchangeList(searchCondition: ResSearchModel) {
    const transactionEntitySelectQueryBuilder = this.exchangeRepository.repository
      .createQueryBuilder('exchange')
      .where('exchange.exchangeDate BETWEEN :from AND :to', {
        from: moment(searchCondition.from).format('YYYY-MM-DD 00:00:00.000'),
        to: moment(searchCondition.to).format('YYYY-MM-DD 00:00:00.000'),
      })
      .andWhere('exchange.kind IN (:...kind)', { kind: Array.from(searchCondition.checkType) });
    if (searchCondition.note) {
      transactionEntitySelectQueryBuilder.andWhere('exchange.note LIKE :note', { note: `%${escapeWildcards(searchCondition.note)}%` });
    }
    if (searchCondition.accountSeq && searchCondition.accountSeq !== 0) {
      transactionEntitySelectQueryBuilder.andWhere('exchange.account.accountSeq = :accountSeq', { accountSeq: searchCondition.accountSeq });
    }
    transactionEntitySelectQueryBuilder.orderBy('exchange.exchangeDate', 'DESC').addOrderBy('exchange.exchangeSeq', 'DESC');
    const transactionList = await transactionEntitySelectQueryBuilder.getMany();
    const result = transactionList.map(async (transaction) => {
      return this.mapEntityToRes(transaction);
    });
    return Promise.all(result);
  }

  static async saveExchange(exchangeForm: ExchangeForm) {
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      const account = await AccountService.getAccount(exchangeForm.accountSeq);
      const entity = transactionalEntityManager.create(ExchangeEntity, {
        account,
        note: exchangeForm.note,
        sellCurrency: exchangeForm.sellCurrency,
        sellAmount: exchangeForm.sellAmount,
        buyCurrency: exchangeForm.buyCurrency,
        buyAmount: exchangeForm.buyAmount,
        fee: exchangeForm.fee,
        exchangeDate: moment(exchangeForm.exchangeDate).format('YYYY-MM-DD 00:00:00.000'),
      });

      await transactionalEntityManager.save(ExchangeEntity, entity);

      // 계좌 잔고 업데이트
      await this.updateBalanceForInsert(transactionalEntityManager, exchangeForm);
    });
  }

  static async updateExchange(exchangeForm: ExchangeForm) {
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      const beforeData = await this.exchangeRepository.repository.findOne({ where: { exchangeSeq: exchangeForm.exchangeSeq } });
      if (!beforeData) {
        throw new Error('거래 정보를 찾을 수 없습니다.');
      }
      // 계좌 잔고 동기화(이전 상태로 복구)
      await this.updateBalanceForDelete(transactionalEntityManager, beforeData);

      const updateData = {
        ...beforeData,
        note: exchangeForm.note,
        sellCurrency: exchangeForm.sellCurrency,
        sellAmount: exchangeForm.sellAmount,
        buyCurrency: exchangeForm.buyCurrency,
        buyAmount: exchangeForm.buyAmount,
        fee: exchangeForm.fee,
        exchangeDate: moment(exchangeForm.exchangeDate).format('YYYY-MM-DD 00:00:00.000'),
      };

      await transactionalEntityManager.save(ExchangeEntity, updateData);
      // 계좌 잔고 업데이트
      await this.updateBalanceForInsert(transactionalEntityManager, exchangeForm);
    });
  }

  static async deleteExchange(exchangeSeq: number) {
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      const beforeData = await this.exchangeRepository.repository.findOne({ where: { exchangeSeq } });
      if (!beforeData) {
        throw new Error('거래 정보를 찾을 수 없습니다.');
      }
      await transactionalEntityManager.delete(ExchangeEntity, { exchangeSeq });
      await this.updateBalanceForDelete(transactionalEntityManager, beforeData);
    });
  }

  private static async updateBalanceForInsert(transactionalEntityManager: EntityManager, exchangeForm: ExchangeForm) {
    await AccountService.updateAccountBalance(
      transactionalEntityManager,
      exchangeForm.accountSeq,
      exchangeForm.sellCurrency,
      -exchangeForm.sellAmount,
    );
    await AccountService.updateAccountBalance(transactionalEntityManager, exchangeForm.accountSeq, exchangeForm.buyCurrency, exchangeForm.buyAmount);
    await AccountService.updateAccountBalance(transactionalEntityManager, exchangeForm.accountSeq, Currency.KRW, -exchangeForm.fee);
  }

  private static async updateBalanceForDelete(transactionalEntityManager: EntityManager, beforeData: ExchangeEntity) {
    await AccountService.updateAccountBalance(
      transactionalEntityManager,
      beforeData.account.accountSeq,
      beforeData.sellCurrency,
      beforeData.sellAmount,
    );
    await AccountService.updateAccountBalance(
      transactionalEntityManager,
      beforeData.account.accountSeq,
      beforeData.buyCurrency,
      -beforeData.buyAmount,
    );
    await AccountService.updateAccountBalance(transactionalEntityManager, beforeData.account.accountSeq, Currency.KRW, beforeData.fee);
  }
}