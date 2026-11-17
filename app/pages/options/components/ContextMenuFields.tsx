import * as React from 'react';
import { Component } from 'react';
import styled from 'styled-components';
import { AppColor } from '../Colors';
import { CheckBoxField } from './CheckBoxField';

const Container = styled.div`
  box-sizing: border-box;

  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;

  width: 100%;
`;

const Label = styled.span<{}>`
  color: ${AppColor.black};
  font-size: 14px;

  margin-bottom: 4px;
`;

const InformationText = styled.span<{}>`
  display: block;

  font-size: 14px;
  color: ${AppColor.subtext};

  margin-bottom: 8px;
`;

interface Property{
  shiftNativeMenu: boolean;
  overrideContextMenu: boolean;
  onClickShiftNativeMenu: () => void;
  onClickOverrideContextMenu: () => void;
}

export class ContextMenuFields extends Component<Property>{

  public render(): JSX.Element{
    return(
      <Container>
        <Label>Context menu</Label>
        <InformationText>
          {`X shows its own menu when you right-click an image. "Download Original Image" is in the browser's context menu.`}
        </InformationText>
        <CheckBoxField
          label="Shift + right-click on an image opens the browser's context menu"
          isOn={this.props.shiftNativeMenu}
          onClick={() => this.props.onClickShiftNativeMenu()} />
        <CheckBoxField
          label="Always open the browser's context menu on images (X's own menu is not shown)"
          isOn={this.props.overrideContextMenu}
          onClick={() => this.props.onClickOverrideContextMenu()} />
      </Container>
    )
  }
}
