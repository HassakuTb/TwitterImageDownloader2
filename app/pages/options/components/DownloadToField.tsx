import * as React from 'react';
import { Component } from 'react';
import styled from 'styled-components';
import { AppColor } from '../Colors';
import { TextField } from './TextField';
import { TagUserId, TagTweetId, TagImageIndex, TagExtension, DefaultFilename } from '../../../scripts/Setting';
import { SetToDefaultButton } from './SetToDefaultButton';

const InvalidMessage = "directory name can not set to an empty.";

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

const ValidationBlock = styled.span<{}>`
  font-size: 14px;
  color: ${AppColor.errorMessage};

  min-height: 3em;
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
}

interface State{
  isValid: boolean;
}

export class DownloadToField extends Component<Property, State>{

  constructor(props: Property){
    super(props);

    this.state ={
      isValid : this.isValid(props.value)
    };
  }

  private isValid(text: string): boolean{
    if(text.trim().length === 0) return true;
    else return text.split("/").every(x => x.trim().length > 0);
  }

  private setToDefaultFilename(): void{
    this.setState({isValid: true})
    this.props.onChange(`TwitterImageDLer/${DefaultFilename}`);
  }

  public render(): JSX.Element{
    return(
      <Container>
        <Label>Filename</Label>
        <TextField
          value={this.props.value}
          placeholder="input filename here"
          isValid={this.state.isValid}
          onChange={(v) =>{
            this.setState({isValid: this.isValid(v)})
            this.props.onChange(v);
          }}
          processPostChange={v => v.trim().replace('\\', '/').replace(/[#:,*?"|]/g, '_')}
        ></TextField>
        <ValidationBlock>
          {this.state.isValid ? "" : InvalidMessage}
        </ValidationBlock>
        <div>
          <Paragraph>
            <InformationText>{`Input "/" to create directory.`}</InformationText>
            <InformationText>{`e.g. "${TagUserId}/${TagTweetId}.${TagExtension}" makes directory for each users.`}</InformationText>
          </Paragraph>
          <Paragraph>
            <InformationText>{`You can use followings.`}</InformationText>
            <InformationText>{`${TagUserId} : user id`}</InformationText>
            <InformationText>{`${TagTweetId} : tweet id`}</InformationText>
            <InformationText>{`${TagImageIndex} : index of image (1...4). if image was single, replace with "1"`}</InformationText>
            <InformationText>{`${TagExtension} : "png" or "jpg"`}</InformationText>
          </Paragraph>
          <Paragraph>
            <InformationText>{`Default value is "TwitterImageDLer/${DefaultFilename}".`}</InformationText>
            <InformationText><SetToDefaultButton onClick={()=>{this.setToDefaultFilename()}}/></InformationText>
          </Paragraph>
        </div>
      </Container>
    );
  }
}