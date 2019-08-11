import { Store } from "redux";
import { subscribeActionAfter as subscribe } from 'redux-subscribe-action';

export const actions = {
  execute: {
    init: "pwn/execute/INIT",
    success: "pwn/execute/SUCCESS",
    error: "pwn/execute/ERROR"
  },
  abort: {
    init: "pwn/abort/INIT",
    success: "pwn/abort/SUCCESS",
    error: "pwn/abort/ERROR"
  },
  open: {
    init: "pwn/open/INIT",
    success: "pwn/open/SUCCESS",
    error: "pwn/open/ERROR"
  },
  close: {
    init: "pwn/close/INIT",
    success: "pwn/close/SUCCESS",
    error: "pwn/close/ERROR"
  },
  resources: {
    init: "pwn/resources/INIT",
    success: "pwn/resources/SUCCESS",
    error: "pwn/resources/ERROR"
  }
};

interface IDataConfig {
  name?: string;
  transform?: (obj: any[]) => any[];
  merge?: (obj1: any, obj2: any) => any;
}

export interface IMessageConfig {
  type: "execute" | "abort" | "open" | "close" | "resources";
  resource?: string;
  success?: boolean;
  error?: string;
  queryId?: string;
  batchSize?: number;
  results?: any[];
}

export class DataApi {
  protected store: Store;
  protected ws: any;
  protected queryId: number;
  protected subscribe: Function;
  protected configs: { [key: string]: IDataConfig };

  constructor({ store, ws }: { store: Store; ws: any }) {
    ws.onmessage = this.handleMessage;
    this.store = store;
    this.ws = ws;
    this.queryId = 0;
    this.configs = {};
  }

  protected handleMessage = ({ data }: { data: string }) => {
    const message: IMessageConfig = JSON.parse(data);
    console.log(message);
    const { type } = message;
    if (type == "execute") {
      this.handleExecute(message);
    } else if (type == "abort") {
      this.handleAbort(message);
    } else if (type == "open") {
      this.handleOpen(message);
    } else if (type == "close") {
      this.handleClose(message);
    } else if (type == "resources") {
      this.handleResources(message);
    }
  };

  protected handleExecute = (message: IMessageConfig) => {
    const { success, error, queryId = "" } = message;
    if (success) {
      const { results } = message;
      const config = this.configs[queryId];
      this.store.dispatch({ type: actions.execute.success, queryId, results, config });
    } else if (error) {
      this.store.dispatch({ type: actions.execute.error, error, queryId });
    }
    delete this.configs[queryId];
  };

  protected handleAbort = (message: IMessageConfig) => {
    const { success, error, queryId = "" } = message;
    if (success) {
      this.store.dispatch({ type: actions.abort.success, queryId });
    } else if (error) {
      this.store.dispatch({ type: actions.abort.error, error, queryId });
    }
    delete this.configs[queryId];
  };

  protected handleOpen = (message: IMessageConfig) => {
    const { success, error, resource } = message;
    if (success) {
      this.store.dispatch({ type: actions.open.success, resource });
    } else if (error) {
      this.store.dispatch({ type: actions.open.error, error, resource });
    }
  };

  protected handleClose = (message: IMessageConfig) => {
    const { success, error, resource } = message;
    if (success) {
      this.store.dispatch({ type: actions.close.success, resource });
    } else if (error) {
      this.store.dispatch({ type: actions.close.error, error, resource });
    }
  };

  protected handleResources = (message: IMessageConfig) => {
    const { success, error, results } = message;
    if (success) {
      this.store.dispatch({ type: actions.resources.success, results });
    } else if (error) {
      this.store.dispatch({ type: actions.resources.error, error });
    }
  };

  public execute = (message: {
    statement: string;
    resource: string;
    batchSize?: number;
  }, config: IDataConfig = {}) => {
    const queryId = this.queryId++;
    this.configs[queryId] = config;
    this.ws.send(JSON.stringify({ type: "execute", queryId, ...message }));
    this.store.dispatch({ type: actions.execute.init, queryId, ...message });
    return new Promise((resolve, reject) => {
      let unsubscribeError, unsubscribeSuccess;
      unsubscribeSuccess = subscribe(actions.execute.success, (action: any) => {
        if (action.queryId === queryId) {
          unsubscribeSuccess();
          unsubscribeError();
          resolve(action);
        }
      });
      unsubscribeError = subscribe(actions.execute.error, (action: any) => {
        if (action.queryId === queryId) {
          unsubscribeSuccess();
          unsubscribeError();
          reject(action);
        }
      });
    });

  };

  public abort = (message: { queryId: string; resource: string }) => {
    this.ws.send(JSON.stringify({ type: "abort", ...message }));
    this.store.dispatch({ type: actions.abort.init, ...message });
    return new Promise((resolve, reject) => {
      let unsubscribeError, unsubscribeSuccess;
      unsubscribeSuccess = subscribe(actions.abort.success, (action: any) => {
        if (action.queryId === message.queryId) {
          unsubscribeSuccess();
          unsubscribeError();
          resolve(action);
        }
      });
      unsubscribeError = subscribe(actions.abort.error, (action: any) => {
        if (action.queryId === message.queryId) {
          unsubscribeSuccess();
          unsubscribeError();
          reject(action);
        }
      });
    });
  };

  public open = (message: {
    resource: string;
    user: string;
    password: string;
  }) => {
    this.ws.send(JSON.stringify({ type: "open", ...message }));
    this.store.dispatch({ type: actions.open.init, ...message });
    return new Promise((resolve, reject) => {
      let unsubscribeError, unsubscribeSuccess;
      unsubscribeSuccess = subscribe(actions.open.success, (action: any) => {
        if (action.resource === message.resource) {
          unsubscribeSuccess();
          unsubscribeError();
          resolve(action);
        }
      });
      unsubscribeError = subscribe(actions.open.error, (action: any) => {
        if (action.resource === message.resource) {
          unsubscribeSuccess();
          unsubscribeError();
          reject(action);
        }
      });
    });
  };

  public resources = () => {
    this.ws.send(JSON.stringify({ type: "resources" }));
    this.store.dispatch({ type: actions.resources.init });
    return new Promise((resolve, reject) => {
      let unsubscribeError, unsubscribeSuccess;
      unsubscribeSuccess = subscribe(actions.resources.success, (action: any) => {
          unsubscribeSuccess();
          unsubscribeError();
          resolve(action);
      });
      unsubscribeError = subscribe(actions.resources.error, (action: any) => {
          unsubscribeSuccess();
          unsubscribeError();
          reject(action);
      });
    });
  };

  public close = (message: { resource: string }) => {
    this.ws.send(JSON.stringify({ type: "close", ...message }));
    this.store.dispatch({ type: actions.close.init, ...message });
    return new Promise((resolve, reject) => {
      let unsubscribeError, unsubscribeSuccess;
      unsubscribeSuccess = subscribe(actions.close.success, (action: any) => {
        if (action.resource === message.resource) {
          unsubscribeSuccess();
          unsubscribeError();
          resolve(action);
        }
      });
      unsubscribeError = subscribe(actions.close.error, (action: any) => {
        if (action.resource === message.resource) {
          unsubscribeSuccess();
          unsubscribeError();
          reject(action);
        }
      });
    });
  };
}

export const createKeyMergeFunction = (keyFunction: (o: any) => string)  => (
  oldData: {[key: string]: any},
  newData: IData
) => {
  const data = { ...oldData };
  newData.forEach((i: any) => (data[keyFunction(i)] = i));
  return data;
};

type IData = any[] | {[key: string]: any};

export const dataReducer = (
  state: { [key: string]: any } = {},
  action: { type: string, name?: string, keyFunction: (o: any) => string, data?: any[], merge?: (o1: IData, o2: IData) => IData}
) => {
  let data;
  console.log(action);
  switch (action.type) {
    case actions.execute.success:
      const { merge } = action;
      if (!action.name) {
        return state;
      } else if (merge) {
        data = merge(
          state[action.name] || {},
          action.data || []
        );
      }
      else {
        data = action.data;
      }
      return { ...state, [action.name]: data };
    default:
      return state;
  }
};
