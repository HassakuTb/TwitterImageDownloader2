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

const ErrorText = styled.span<{}>`
  display: block;

  font-size: 14px;
  color: ${AppColor.errorMessage};

  margin-bottom: 8px;
`;

interface Property{
  isOn: boolean;
  /** the browser cannot run the page-world script that video download needs */
  isUnsupported: boolean;
  onClick: () => void;
}

export class VideoBetaField extends Component<Property>{

  public render(): JSX.Element{
    return(
      <Container>
        <Label>Video (beta)</Label>
        <InformationText>
          {`Adds "Download Video (beta)" to the browser's context menu on videos and GIFs. It saves the highest quality mp4 (GIFs are saved as mp4). To find the video, a script runs in X's page and reads the data that X has loaded.`}
        </InformationText>
        {this.props.isUnsupported ?
          <ErrorText>
            {`This browser does not support it. Chrome 102+ or Firefox 128+ is required.`}
          </ErrorText> : null}
        <CheckBoxField
          label="Enable video download (beta)"
          isOn={this.props.isOn && !this.props.isUnsupported}
          disabled={this.props.isUnsupported}
          onClick={() => this.props.onClick()} />
      </Container>
    )
  }
}
