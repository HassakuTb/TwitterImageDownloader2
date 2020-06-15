import * as React from 'react';
import { Component } from 'react';
import styled from 'styled-components';
import { AppColor } from '../Colors';
import { TextField } from './TextField';

const InvalidMessage = "directory name can not set to an empty.";

const Container = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;

  margin-bottom: 16px;

  height: 42px;
`;

const Label = styled.span<{}>`
  color: ${AppColor.black};
  font-size: 14px;

  margin-right: 4px;
`;

const ValidationBlock = styled.span<{}>`
  font-size: 14px;
  color: ${AppColor.errorMessage};

  width: 11em;
  margin-left: 4px;

  min-height: 3em;

  flex-grow: 1;
`;

interface Property{
  value: string;
  onChange: (value: string) => void;
}

interface State{
  isValid: boolean;
}

export class DownloadToField extends Component<Property, State>{

  constructor(props: Property){
    super(props);

    this.state ={
      isValid : this.isValid(props.value)
    };
  }

  private isValid(text: string): boolean{
    if(text.trim().length === 0) return true;
    else return text.split("/").every(x => x.trim().length > 0);
  }

  public render(): JSX.Element{
    return(
      <Container>
        <Label>Download to :</Label>
        <TextField
          value={this.props.value}
          isValid={this.state.isValid}
          onChange={(v) =>{
            this.setState({isValid: this.isValid(v)})
            this.props.onChange(v);
          }}
          processPostChange={v => v.trim().replace('\\', '/').replace(/[#:,*?"<>|]/g, '_')}
        ></TextField>
        <ValidationBlock>
          {this.state.isValid ? "" : InvalidMessage}
        </ValidationBlock>
      </Container>
    );
  }
}