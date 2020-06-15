import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Component } from 'react';
import styled from 'styled-components';

const Layout = styled.div`
  padding: 40px;
`;

class Options extends Component{
  
  render(): JSX.Element{
    return(
      <Layout>
        HELLO!!
      </Layout>
    );
  }
}

document.body.style.margin = "0px";
const app = document.createElement('div');
document.body.appendChild(app);
ReactDOM.render(<Options />, app);