import React, { useState, useRef } from 'react';
import { UnControlled as CodeMirror } from 'react-codemirror2';
require('codemirror/mode/javascript/javascript');
require('codemirror/addon/hint/show-hint');
require('codemirror/addon/hint/javascript-hint');

import { Row, Col, Input, Divider, Button, Tree, notification, Card, Typography, Radio } from 'antd';
import { TreeNodeNormal } from 'antd/lib/tree/Tree';
import { Client, DefaultClientCodec, ClientContext } from '@hprose/rpc-core';
import { Formatter } from '@hprose/io';
import '@hprose/rpc-html5';
import request from 'umi-request';

import './index.css';
import RadioGroup from 'antd/lib/radio/group';

const { Title } = Typography;

export default function() {
  const [uri, setUri] = useState<string>('http://sstk.test/api');
  const [funcs, setFuncs] = useState<Array<TreeNodeNormal>>([
    {
      key: '0',
      title: '等待载入中...',
    },
  ]);
  const [funcLoading, setFuncLoading] = useState<boolean>(false);
  const [params, setParams] = useState<any>();
  const [currentFunction, setCurrentFunction] = useState<string>('');
  const [invokeResponse, setInvokeResponse] = useState<string>('// 响应结果输出...');
  const [invokeResultMode, setInvokeResultMode] = useState<string>('Normal');
  const [invokeResultTimeout, setInvokeResultTimeout] = useState<number>(300000);

  const handleConnectHprose = (e: any) => {
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
      setFuncs(renderFunctions);
    }
  };

  const getClient = (): Client => {
    let Settings = {
      timeout: invokeResultTimeout
    };
    const client = new Client(uri);
    client.useService<any>();
    return client;
  };

  const handleInvoke = () => {
    try {
      getClient()
      .invoke(currentFunction, [JSON.parse(params)])
      .then(response => {
        if (response) {
          setInvokeResponse(JSON.stringify(response, null, 2));
        }
      })
      .catch(e => {
        notification.warn({
          message: '错误提示',
          description: e.toString(),
        });
      });
    } catch(e) {
      notification.error({
        message: "调用出错",
        description: `请检请求参数是否正确...\n${e.toString()}`
      });
    }

  };

  const handleUriChange = (e: any) => {
    setUri(e.target.value);
  };

  const handleResponseModeChange = (e: any) => {
    setInvokeResultMode(e.target.value);
  };

  return (
    <div style={{ minHeight: 723 }}>
      <Row gutter={{ xs: 8, sm: 16, md: 24 }}>
        <Col span={21}>
          <Input.Search
            size='large'
            placeholder="请输入Hprose服务接口地址..."
            defaultValue="http://"
            onChange={handleUriChange}
          />
        </Col>
        <Col span={3}>
          <Button type="primary" size='large' onClick={e => handleConnectHprose(e)}>
            获取方法列表
          </Button>
        </Col>
      </Row>
      <Row gutter={{ xs: 8, sm: 16, md: 24 }} style={{ marginTop: 20 }}>
        <Col span={6}>
          <Card title="方法" style={{ height: '100%', minHeight: 650, maxHeight: 650, paddingBottom: 20 }}>
            <Tree
              showLine
              style={{height: 543, paddingBottom: 20, overflow: 'scroll'}}
              treeData={funcs}
              onSelect={(selectedKeys, info) => {
                setCurrentFunction(selectedKeys[0]);
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card title="请求" style={{ height: '100%', minHeight: 650, maxHeight: 650, paddingBottom: 20 }}>
            <CodeMirror
              value='// JSON 格式 请求参数
{} | []'
              options={{
                mode: 'javascript',
                theme: 'material',
                lineNumbers: true,
                tabSize: 2,
                readOnly: false,
                hint: 'codeMirror.hint.auto'
              }}
              onChange={(editor, data, value) => {
                setParams(value);
              }}
            />
            <Divider />
            <Button type="primary" size="large" onClick={() => handleInvoke()}>
              发送请求
            </Button>
          </Card>
        </Col>
        <Col span={12}>
          <Card
            title="响应"
            style={{ height: '100%', minHeight: 650, maxHeight: 650, paddingBottom: 20 }}
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
          </Card>

        </Col>
      </Row>
    </div>
  );
}
