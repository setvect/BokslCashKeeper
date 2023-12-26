import { ipcMain, IpcMainEvent } from 'electron';
import log from 'electron-log';
import { IPC_CHANNEL } from '../common/CommonType';
import CategoryService from './service/CategoryService';
import { ResCategoryModel, ResErrorModel } from '../common/ResModel';
import UserService from './service/UserService';
import Constant from '../common/Constant';
import CodeService from './service/CodeService';
import { CodeFrom } from '../common/ReqModel';

function withTryCatch(handler: (event: IpcMainEvent, ...args: any[]) => Promise<void>) {
  return async (event: IpcMainEvent, ...args: any[]) => {
    try {
      await handler(event, ...args);
    } catch (error: any) {
      let resError: ResErrorModel;
      if (error instanceof Error) {
        log.error('Error message:', error.message);
        resError = { message: error.message };
      } else {
        log.error('Unknown error:', error);
        resError = { message: '알려지지 않은 예외가 발생했어요.' };
      }
      event.reply(IPC_CHANNEL.ErrorCommon, resError);
    }
  };
}

export default class IpcHandler {
  static registerHandlers() {
    log.info('IpcHandler.registerHandlers()');
    ipcMain.on(IPC_CHANNEL.ipcExample, async (event, arg) => this.ipcExample(event, arg));
    ipcMain.on(IPC_CHANNEL.CallCategoryLoad, withTryCatch(this.categoryLoad));

    ipcMain.on(IPC_CHANNEL.CallUserCheckPassword, withTryCatch(this.userCheckPassword));
    ipcMain.on(IPC_CHANNEL.CallUserChangePassword, withTryCatch(this.userChangePassword));

    ipcMain.on(IPC_CHANNEL.CallCodeLoad, withTryCatch(this.codeLoad));
    ipcMain.on(IPC_CHANNEL.CallCodeUpdateOrder, withTryCatch(this.codeUpdateOrder));
    ipcMain.on(IPC_CHANNEL.CallCodeSave, withTryCatch(this.codeSave));
  }

  private static ipcExample(event: IpcMainEvent, arg: string) {
    const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
    console.log(msgTemplate(arg));
    event.reply(IPC_CHANNEL.ipcExample, msgTemplate('pong'));
  }

  //  --- Category ---
  private static async categoryLoad(event: IpcMainEvent) {
    log.info('IpcHandler.categoryLoad()');
    const categoryList = await CategoryService.findCategoryAll();

    const response: ResCategoryModel[] = categoryList.map((category) => {
      const { categorySeq, name, kind, parentSeq, orderNo } = category;
      return { categorySeq, name, kind, parentSeq, orderNo };
    });

    event.reply(IPC_CHANNEL.CallCategoryLoad, response);
  }

  // --- User ---

  private static async userCheckPassword(event: IpcMainEvent, password: string) {
    const pass = await UserService.checkPassword(Constant.DEFAULT_USER.userId, password);
    event.reply(IPC_CHANNEL.CallUserCheckPassword, pass);
  }

  private static async userChangePassword(event: IpcMainEvent, args: any) {
    await UserService.changePassword(Constant.DEFAULT_USER.userId, args[0], args[1]);
    event.reply(IPC_CHANNEL.CallUserChangePassword, true);
  }

  // --- Code ---
  private static async codeLoad(event: IpcMainEvent) {
    const result = await CodeService.findCategoryAll();
    event.reply(IPC_CHANNEL.CallCodeLoad, result);
  }

  private static async codeUpdateOrder(event: IpcMainEvent, updateInfo: { codeItemSeq: number; orderNo: number }[]) {
    await CodeService.updateOrderCode(updateInfo);
    event.reply(IPC_CHANNEL.CallCodeUpdateOrder, true);
  }

  private static async codeSave(event: IpcMainEvent, codeForm: CodeFrom) {
    await CodeService.saveOrderCode(codeForm);
    event.reply(IPC_CHANNEL.CallCodeSave, true);
  }
}