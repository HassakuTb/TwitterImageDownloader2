import * as React from 'react';
import { Component } from 'react';
import styled from 'styled-components';
import { AppColor } from '../Colors';

const Container = styled.div<{}>`
  box-sizing: border-box;

  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;

  margin-bottom: 16px;

  border-style: solid;
  border-width: 1px;
  border-color: ${AppColor.primary};
  border-radius: 4px;

  padding: 4px 16px;

  opacity: 1px;

  cursor: pointer;

  &:hover{
    opacity: 0.8;
  }

  &.disabled{
    opacity: 0.4;
    cursor: default;
  }
`;

const CheckBox = styled.span`
  flex-shrink: 0;

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
  label: string;
  isOn: boolean;
  onClick: () => void;
  /** greyed out and does not respond to clicks */
  disabled?: boolean;
}

export class CheckBoxField extends Component<Property>{

  public render(): JSX.Element{
    return(
      <Container
        className={this.props.disabled ? "disabled" : ""}
        onClick={() => { if (!this.props.disabled) this.props.onClick(); }}>
        <CheckBox className={this.props.isOn ? "checked": ""} />
        <Label>{this.props.label}</Label>
      </Container>
    )
  }
}
