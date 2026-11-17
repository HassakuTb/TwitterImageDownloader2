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

/** options that belong to the beta checkbox */
const ChildFields = styled.div`
  box-sizing: border-box;

  display: flex;
  flex-direction: column;
  align-items: stretch;

  padding-left: 32px;
`;

interface Property{
  isOn: boolean;
  /** the browser cannot run the page-world script that video download needs */
  isUnsupported: boolean;
  onClick: () => void;
  /** "Download All Media in Post" also saves videos and GIFs */
  bulkIncludeVideo: boolean;
  onClickBulkIncludeVideo: () => void;
}

export class VideoBetaField extends Component<Property>{

  public render(): JSX.Element{
    const active = this.props.isOn && !this.props.isUnsupported;
    return(
      <Container>
        <Label>Video and all media in a post (beta)</Label>
        <InformationText>
          {`Adds "Download Video (beta)" to the browser's context menu on videos and GIFs. It saves the highest quality mp4 (GIFs are saved as mp4). To find the video, a script runs in X's page and reads the data that X has loaded.`}
        </InformationText>
        <InformationText>
          {`Also adds "Download All Media in Post (beta)" when you right-click the text or a blank area of a post (not its images). It saves every photo of the post (and its videos and GIFs if included below) at once. The "Save As" dialog is not shown for it. If the filename format has neither <imageindex> nor <original>, "-<imageindex>" is added before ".<ext>" so that the files do not share a name.`}
        </InformationText>
        {this.props.isUnsupported ?
          <ErrorText>
            {`This browser does not support it. Chrome 102+ or Firefox 128+ is required.`}
          </ErrorText> : null}
        <CheckBoxField
          label="Enable video download and download of all media in a post (beta)"
          isOn={active}
          disabled={this.props.isUnsupported}
          onClick={() => this.props.onClick()} />
        <ChildFields>
          <CheckBoxField
            label={`Include videos and GIFs in "Download All Media in Post"`}
            isOn={this.props.bulkIncludeVideo}
            disabled={!active}
            onClick={() => this.props.onClickBulkIncludeVideo()} />
        </ChildFields>
      </Container>
    )
  }
}
