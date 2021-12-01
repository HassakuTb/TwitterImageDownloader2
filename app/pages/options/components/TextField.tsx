import * as React from 'react';
import { Component } from 'react';
import styled from 'styled-components';
import { AppColor } from '../Colors';

const StyledTextbox = styled.input<{}>`
  box-sizing: border-box;

  border-style: solid;
  border-color: ${AppColor.primary};
  border-width: 2px;
  border-radius: 4px;
  font-size: 14px;

  outline-width: 0px;

  padding: 8px;

  color: ${AppColor.black};

  width: 100%;

  background-color: white;

  &::placeholder{
    color: ${AppColor.placeholder};
  }

  &:focus{
    background-color: ${AppColor.focus};
  }

  &.invalid{
    background-color: ${AppColor.invalidField};
  }
`;

interface Property{
  value: string;
  isValid: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  processPostChange: (text: string) => string;
}

interface State{
  isValid: string;
}

export class TextField extends Component<Property>{

  constructor(props: Property){
    super(props);
  }

  private onChangeText(text: string){
    this.props.onChange(text);
  }

  private onChange(e: React.ChangeEvent<HTMLInputElement>): void{
    const text = this.props.processPostChange(e.target.value);
    this.onChangeText(text);
  }

  private onKeyUp(e: any): void{
    this.onChangeText(e.target.value);
  }

  public render(): JSX.Element{
    return(
      <StyledTextbox
        type="text"
        placeholder={this.props.placeholder}
        className={this.props.isValid ? "" : "invalid"}
        value={this.props.value}
        onChange={(e) => this.onChange(e)}
        onKeyUp={(e) => this.onKeyUp(e)}
        />
    );
  }
}