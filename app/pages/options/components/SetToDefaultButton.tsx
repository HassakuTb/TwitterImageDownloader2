import * as React from 'react';
import { Component } from 'react';
import styled from 'styled-components';
import { AppColor } from '../Colors';

const StyledButton = styled.button<{}>`
  background: transparent;
  
  border-style: solid;
  border-width: 1px;
  border-color: ${AppColor.primary};
  border-radius: 4px;

  box-shadow: none;

  color: ${AppColor.primary};
  font-size: 14px;

  padding: 0px 8px;
  opacity: 1;

  cursor: pointer;

  outline-width: 0px;

  &:hover{
    opacity: 0.8;
  }
`;

interface Property{
  onClick: () => void;
}

export class SetToDefaultButton extends Component<Property>{

  public render(): JSX.Element{
    return(
      <StyledButton onClick={() => this.props.onClick()}>
        Set to default
      </StyledButton>
    )
  }
}