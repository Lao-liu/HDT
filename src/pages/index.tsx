import React, { useState } from 'react';
import { UnControlled as CodeMirror } from 'react-codemirror2';
import { Button, Card, Col, Divider, Input, notification, Row, Select, Tree } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { TreeNodeNormal } from 'antd/lib/tree/Tree';
import { Client } from '@hprose/rpc-core';
import { Formatter } from '@hprose/io';
import '@hprose/rpc-html5';
import request from 'umi-request';

import './index.css';

require('codemirror/mode/javascript/javascript');
require('codemirror/addon/hint/show-hint');
require('codemirror/addon/hint/javascript-hint');

interface InvokeHistory {
  uri: string;
  methods: any;
  current: string;
  params: any;
  response: string;
}

export default function() {
  const [ uri, setUri ] = useState<string>(localStorage.getItem('uri') || 'http://sstk.test/api');
  const [ functions, setFunctions ] = useState<Array<TreeNodeNormal>>([
    {
      key: '0',
      title: '等待获取中...',
    },
  ]);
  const [ funcLoading, setFuncLoading ] = useState<boolean>(false);
  const [ paramsInput, setParamsInput ] = useState<any>(localStorage.getItem('params') ?? `// JSON 格式 请求参数
{} | []`);
  const [ params, setParams ] = useState<any>();
  const [ currentFunction, setCurrentFunction ] = useState<string>('');
  const [ invokeResponse, setInvokeResponse ] = useState<string>('// 响应结果输出...');
  const [ invokeResultMode, setInvokeResultMode ] = useState<string>('Normal');
  const [ invokeResultTimeout, setInvokeResultTimeout ] = useState<number>(300000);
  const [ invokeResponseLoading, setInvokeResponseLoading ] = useState<boolean>(false);

  const handleConnectHprose = (e: any) => {
    if (localStorage.getItem('params') === `// JSON 格式 请求参数
{} | []`) {
      setParamsInput(`{
  "":""
}`);
    } else {
      setParams(localStorage.getItem('params'));
    }

    request
      .post(uri, {
        data: 'z',
        timeout: 3000,
      })
      .then(result => {
        handleSetFunctions(result);
      })
      .catch(e => {
        notification.warn({
          message: '错误提示',
          description: `${e.toString()}\n${uri}`,
        });
      });
  };

  const handleSetFunctions = (result: string) => {
    const functions = Formatter.deserialize(result.substr(1, result.length - 2));
    const renderFunctions: TreeNodeNormal[] = [];
    if (Array.isArray(functions)) {
      functions.map(f => {
        renderFunctions.push({
          key: f,
          title: f === '*' ? '迷失方法 [ * ]' : f,
        });
      });
      setFunctions(renderFunctions);
    }
  };

  const getClient = (): Client => {
    localStorage.setItem('uri', uri);
    let Settings = {
      timeout: invokeResultTimeout,
    };
    const client = new Client(uri);
    client.useService<any>();
    return client;
  };

  const handleInvoke = () => {
    try {
      localStorage.setItem('params', params);
      setInvokeResponse('载入中...');
      setInvokeResponseLoading(true);
      getClient()
        .invoke(currentFunction, [ JSON.parse(params) ])
        .then(response => {
          if (response) {
            setInvokeResponseLoading(false);
            setInvokeResponse(JSON.stringify(response, null, 2));
            handleSetHistory({
              uri,
              methods: functions,
              current: currentFunction,
              params,
              response,
            });
          }
        })
        .catch(e => {
          notification.warn({
            message: '错误提示',
            description: e.toString(),
          });
          setInvokeResponse(e.toString());
          setInvokeResponseLoading(false);
        });
    } catch (e) {
      notification.error({
        message: '调用出错',
        description: `请检请求参数是否正确...\n${e.toString()}`,
      });
      setInvokeResponseLoading(false);
    }
  };

  const handleUriChange = (e: any) => {
    setUri(e.target.value);
  };

  const handleResponseModeChange = (e: any) => {
    setInvokeResultMode(e.target.value);
  };

  const handleSetHistory = (history: InvokeHistory) => {
    const historyList: {[key: string]: InvokeHistory[]} = handleGetHistory();

    if (historyList[history.uri] === undefined) {
      historyList[history.uri] = [];
    }
    if (historyList[history.uri].length >= 20) {
      historyList[history.uri].shift();
    }

    let itemKey = 0;
    let exist = historyList[history.uri].some((h, i) => {
      if (h.current === history.current) {
        itemKey = i;
        return true
      }
      return false;
    });

    if (exist) {
      historyList[history.uri][itemKey] = history;
    } else {
      historyList[history.uri].push(history);
    }

    localStorage.setItem('history', JSON.stringify(historyList));
  };

  const handleGetHistory = () => {
    const historyList = localStorage.getItem('history');
    if (historyList) {
      return JSON.parse(historyList);
    }

    return {};
  };

  const handleCleanHistory = () => {
    localStorage.removeItem('history');
    notification.success({
      message: "消息提示",
      description: "历史记录已清空...",
    });
  };

  const handleReviewHistory = (v: string) => {
    const h: InvokeHistory = JSON.parse(v);
    setFunctions(h.methods);
    setUri(h.uri);
    setCurrentFunction(h.current);
    setParamsInput(h.params);
    setInvokeResponse(JSON.stringify(h.response, null, 2));
    notification.success({
      message: '操作提示',
      description: '历史记录已载入...',
    });
  };

  return (
    <div style={{ minHeight: 723 }}>
      <Row gutter={{
        xs: 8, sm: 16, md: 24,
      }}>
        <Col span={21}>
          <Input.Search
            size="large"
            placeholder="请输入Hprose服务接口地址..."
            defaultValue={uri}
            value={uri}
            onChange={handleUriChange}
            onPressEnter={handleConnectHprose}
          />
        </Col>
        <Col span={3}>
          <Button type="primary" size="large" onClick={e => handleConnectHprose(e)}>
            获取方法列表
          </Button>
        </Col>
      </Row>
      <Row gutter={{
        xs: 8, sm: 16, md: 24,
      }} style={{ marginTop: 20 }}>
        <Col span={6}>
          <Card
            title={`方法 (${currentFunction || '空'})`}
            style={{
              height: '100%', minHeight: 650, maxHeight: 650, paddingBottom: 20,
            }}
          >
            <Tree
              showLine
              style={{
                height: 543,
                paddingBottom: 20,
                overflow: 'scroll',
                fontSize: 15,
              }}
              treeData={functions}
              onSelect={(selectedKeys, info) => {
                setCurrentFunction(selectedKeys[0]);
              }}
            />
          </Card>
        </Col>
        <Col span={9}>
          <Card
            title="请求"
            style={{
              height: '100%', minHeight: 650, maxHeight: 650, paddingBottom: 20,
            }}
          >
            <CodeMirror
              value={paramsInput}
              options={{
                mode: 'javascript',
                theme: 'material',
                lineNumbers: true,
                tabSize: 2,
                readOnly: false,
                hint: 'codeMirror.hint.auto',
              }}
              onChange={(editor, data, value) => {
                setParams(value);
              }}
            />
            <Divider />
            <Button type="primary" size="large" onClick={() => handleInvoke()} loading={invokeResponseLoading}>
              发送请求
            </Button>
          </Card>
        </Col>
        <Col span={9}>
          <Card
            title="响应"
            style={{
              height: '100%', minHeight: 650, maxHeight: 650, paddingBottom: 20,
            }}
            loading={invokeResponseLoading}
          >
            <CodeMirror
              value={invokeResponse}
              options={{
                mode: 'javascript',
                theme: 'material',
                lineNumbers: true,
              }}
            />
            <Divider />
            <Select
              placeholder='接口请求历史'
              style={{ width: '60%' }}
              disabled={handleGetHistory().length === 0}
              onSelect={handleReviewHistory}
            >
              {Object.keys(handleGetHistory()).map((huri, index) => <Select.OptGroup key={huri}>
                {handleGetHistory()[huri].map((h: InvokeHistory, i: number) =>
                  <Select.Option key={`${index}-${i}`} value={JSON.stringify(h)} >{`调用: ${h.current} () 方法...`}</Select.Option>)}
              </Select.OptGroup>)}
            </Select>
            <Divider type='vertical' />
            <Button icon={<DeleteOutlined />} danger onClick={() => handleCleanHistory()} >清空历史</Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
