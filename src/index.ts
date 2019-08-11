import { applyMiddleware, createStore } from "redux";
import { DataApi, dataReducer, createKeyMergeFunction } from './pwn-redux';
import subscribeActionMiddleware from 'redux-subscribe-action';

const ws = new WebSocket("ws://localhost:8080");
const store: any = createStore(dataReducer, applyMiddleware(subscribeActionMiddleware));

ws.onopen = (async () => {
  const api = new DataApi({ store, ws });
  const resource = "resource";
  const config = { name: "users", merge: createKeyMergeFunction(u => u.email)};
  await api.open({ resource, user: "user", password: "password" });
  const response: any = await api.execute({ resource, statement: "select * from users" }, config);
  console.log(response.results);
});