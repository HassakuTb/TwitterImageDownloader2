import * as React from 'react';
import { Component } from 'react';
import styled from 'styled-components';
import { AppColor } from '../Colors';

const labelText: string = `Open "save as" window`;

const Container = styled.div<{}>`
  box-sizing: border-box;

  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;

  margin-bottom: 16px;

  height: 42px;

  border-style: solid;
  border-width: 1px;
  border-color: ${AppColor.primary};
  border-radius: 4px;

  padding: 8px 16px;

  opacity: 1px;

  cursor: pointer;

  &:hover{
    opacity: 0.8;
  }
`;

const CheckBox = styled.span`
  width: 24px;
  height: 24px;

  background-image: url("../../../images/check-off.png");
  background-size: 100%;

  &.checked{
    background-image: url("../../../images/check-on.png");
  }
`;

const Label = styled.span`
  color: ${AppColor.black};
  font-size: 14px;

  margin-left: 8px;
`;

interface Property{
  isOn: boolean;
  onClick: () => void;
}

export class EnableSaveAsField extends Component<Property>{

  public render(): JSX.Element{
    return(
      <Container onClick={() => this.props.onClick()}>
        <CheckBox className={this.props.isOn ? "checked": ""} />
        <Label>{labelText}</Label>
      </Container>
    )
  }
}