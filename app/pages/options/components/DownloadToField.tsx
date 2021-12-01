import * as React from 'react';
import { Component } from 'react';
import styled from 'styled-components';
import { AppColor } from '../Colors';
import { TextField } from './TextField';
import { TagUserId, TagTweetId, TagImageIndex, TagOriginal, TagExtension, DefaultFilename } from '../../../scripts/Setting';
import { TagYear, TagMonth, TagDay } from '../../../scripts/Setting';
import { SetToDefaultButton } from './SetToDefaultButton';

const InvalidWithEmptyFilename = "Directory name or filename name can not set to an empty.";
const InvalidWithParse = "Can not parse inputed filename.";

const Container = styled.div`
  box-sizing: border-box;

  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;

  margin-bottom: 16px;
  width: 100%;
`;

const Label = styled.span<{}>`
  color: ${AppColor.black};
  font-size: 14px;

  margin-bottom: 4px;
`;

const ValidationBlock = styled.div<{}>`
  min-height: 4em;
`;

const InvalidText = styled.span<{}>`
  display: block;

  font-size: 14px;
  color: ${AppColor.errorMessage};
`;

const InformationText = styled.span<{}>`
  display: block;

  font-size: 14px;
  color: ${AppColor.subtext};
`;

const Paragraph = styled.p`
  margin: 0px;
  margin-bottom: 8px;
`;

interface Property{
  value: string;
  onChange: (value: string) => void;
  isValidWithEmptyFilename: boolean;
  isValidWithParse: boolean;
}

export class DownloadToField extends Component<Property>{

  private setToDefaultFilename(): void{
    this.setState({isValid: true})
    this.props.onChange(`Twitter/${DefaultFilename}`);
  }

  private get isValid(): boolean{
    return this.props.isValidWithEmptyFilename && this.props.isValidWithParse;
  }

  private renderInvalidEmpty(): JSX.Element | null{
    if(this.props.isValidWithEmptyFilename) return null;
    else return(
      <InvalidText>
        {InvalidWithEmptyFilename}
      </InvalidText>
    );
  }

  private renderInvalidParse(): JSX.Element | null{
    if(this.props.isValidWithParse) return null;
    else return(
      <InvalidText>
        {InvalidWithParse}
      </InvalidText>
    );
  }

  public render(): JSX.Element{
    let now = new Date();
    return(
      <Container>
        <Label>Filename</Label>
        <TextField
          value={this.props.value}
          placeholder="input filename here"
          isValid={this.isValid}
          onChange={(v) =>{this.props.onChange(v)}}
          processPostChange={v => v.trim().replace('\\', '/').replace(/[#:,*?"|]/g, '_')}
        ></TextField>
        <ValidationBlock>
          {this.renderInvalidEmpty()}
          {this.renderInvalidParse()}
        </ValidationBlock>
        <div>
          <Paragraph>
            <InformationText>{`Input "/" to create directory.`}</InformationText>
            <InformationText>{`e.g. "${TagUserId}/${TagTweetId}.${TagExtension}" makes directory for each users.`}</InformationText>
          </Paragraph>
          <Paragraph>
            <InformationText>{`You can use following variables.`}</InformationText>
            <InformationText>{`${TagUserId} : User ID`}</InformationText>
            <InformationText>{`${TagTweetId} : Tweet ID`}</InformationText>
            <InformationText>{`${TagImageIndex} : Index of image (0...3). If there is a single image, the number will be "0".`}</InformationText>
            <InformationText>{`${TagOriginal} : Original file name`}</InformationText>
            <InformationText>{`${TagExtension} : File extension ("png" or "jpg").`}</InformationText>
            <InformationText>{`${TagYear} : Current Year(${now.getFullYear()})`}</InformationText>
            <InformationText>{`${TagMonth} : Current Month(${now.getMonth()+1})`}</InformationText>
            <InformationText>{`${TagDay} : Current Date(${now.getDate()})`}</InformationText>
          </Paragraph>
          <Paragraph>
            <InformationText>{`Default value is "Twitter/${DefaultFilename}".`}</InformationText>
            <InformationText><SetToDefaultButton onClick={()=>{this.setToDefaultFilename()}}/></InformationText>
          </Paragraph>
        </div>
      </Container>
    );
  }
}