import * as React from 'react';
import { Component } from 'react';
import styled from 'styled-components';
import { AppColor } from '../Colors';

const StyledButton = styled.button<{}>`
  background: ${AppColor.primary};
  
  border-style: solid;
  border-width: 1px;
  border-color: ${AppColor.primary};
  border-radius: 4px;

  box-shadow: 0px 1px 2px gray;

  color: white;
  font-size: 14px;

  padding: 8px 16px;
  opacity: 1;

  cursor: pointer;

  outline-width: 0px;

  &:hover{
    opacity: 0.8;
  }
`;

interface Property{
  onClick: () => void;
  disabled?: boolean;
}

export class SaveButton extends Component<Property>{

  private get disabled(): boolean{
    if(this.props.disabled === undefined){
      return false;
    }
    else{
      return this.props.disabled;
    }
  }

  public render(): JSX.Element{
    return(
      <StyledButton disabled={this.disabled} onClick={() => this.props.onClick()}>
        Save
      </StyledButton>
    )
  }
}