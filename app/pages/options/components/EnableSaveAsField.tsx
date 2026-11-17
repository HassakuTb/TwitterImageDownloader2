import * as React from 'react';
import { Component } from 'react';
import { CheckBoxField } from './CheckBoxField';

const labelText: string = `Show "Save As" dialogues`;

interface Property{
  isOn: boolean;
  onClick: () => void;
}

export class EnableSaveAsField extends Component<Property>{

  public render(): JSX.Element{
    return(
      <CheckBoxField label={labelText} isOn={this.props.isOn} onClick={() => this.props.onClick()} />
    )
  }
}
