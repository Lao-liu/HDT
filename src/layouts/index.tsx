import React from 'react';
import { Layout } from 'antd';

const { Header, Footer, Content } = Layout;

const BasicLayout: React.FC = props => {
  return (
    <Layout>
      <Header style={{ color: '#ffffff', fontSize: 22 }}>Hprose Developer Tools</Header>
      <Content style={{padding: 24}}>{props.children}</Content>
      <Footer style={{textAlign: 'center', background: '#001529', color: 'rgb(255, 255, 255)'}}>
        HDT <a href="https://github.com/Lao-liu/HDT" target="_block">https://github.com/Lao-liu/HDT</a> For <a href="https://github.com/hprose" target="_block">https://github.com/hprose</a>
        </Footer>
    </Layout>
  );
};

export default BasicLayout;
