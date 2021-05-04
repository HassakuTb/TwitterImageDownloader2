import * as React from 'react';
import { Component } from 'react';
import styled from 'styled-components';
import { SaveButton } from './SaveButton';
import { Spinner } from './Spinner';
import { DownloadToField } from './DownloadToField';
import { EnableSaveAsField } from './EnableSaveAsField';
import { CreateDefaultSetting, Setting, IsLatestDataVersion, MigrateSetting1to2, TagUserId, TagTweetId, TagImageIndex, TagOriginal, TagExtension } from '../../../scripts/Setting';
import { TagYear, TagMonth, TagDay } from '../../../scripts/Setting';

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;

  width: 800px;
`;

const defaultDirnameDownloadTo: string = 'TwitterImageDLer';
const defaultEnableOpenSaveAs: boolean = false;

interface OptionState{
  isLoaded: boolean;
  dirnameDownloadTo: string;
  enableOpenSaveAs: boolean;
  isValidWithEmptyFilename: boolean;
  isValidWithParse: boolean;
}

export class OptionsForm extends Component<any, OptionState>{

  constructor(props: any){
    super(props);

    this.state = {
      isLoaded : false,
      dirnameDownloadTo: defaultDirnameDownloadTo,
      enableOpenSaveAs: defaultEnableOpenSaveAs,
      isValidWithEmptyFilename: false,
      isValidWithParse: false,
    }
  }

  private saveOptions(): void{
    this.setState({isLoaded: false});

    chrome.storage.local.set({
      download_to: this.state.dirnameDownloadTo,
      open_save_as: this.state.enableOpenSaveAs,
      data_version: 2,
    }, () =>{
      this.setState({
        isLoaded: true,
      });
      console.log("save done");
      window.close();
    });
  }

  private restoreOptions(): void{
    chrome.storage.local.get({
      download_to : defaultDirnameDownloadTo,
      open_save_as : defaultEnableOpenSaveAs,
      data_version : 1,
    }, (items: any) => {
      
      let setting: Setting = (items.download_to === undefined || items.download_to === null) ?
        CreateDefaultSetting() : (items as Setting);
  
      if(!IsLatestDataVersion(setting)){
        setting = MigrateSetting1to2(setting);
      }

      this.setState({
        isLoaded: true,
        dirnameDownloadTo: setting.download_to!,
        enableOpenSaveAs: setting.open_save_as!,
        isValidWithEmptyFilename: this.isValidWithEmptyFilename(setting.download_to!),
        isValidWithParse: this.isValidWithParse(setting.download_to!),
      });
    });
  }

  componentDidMount(){
    this.restoreOptions();
  }

  private isValidWithParse(newName: string){
    let s: string = newName;
    s = s.replace(TagUserId, "");
    s = s.replace(TagTweetId, "");
    s = s.replace(TagImageIndex, "");
    s = s.replace(TagOriginal, "");
    s = s.replace(TagExtension, "");
    s = s.replace(TagYear, "");
    s = s.replace(TagMonth, "");
    s = s.replace(TagDay, "");
    return !(s.includes("<") || s.includes(">"));
  }

  private isValidWithEmptyFilename(newName: string){
    return newName.split("/").every(x => x.trim().length > 0);
  }

  private onChangeFilename(newName: string){
    this.setState({
      dirnameDownloadTo: newName,
      isValidWithEmptyFilename: this.isValidWithEmptyFilename(newName),
      isValidWithParse: this.isValidWithParse(newName),
    });
  }

  private get canSave(): boolean{
    return this.state.isValidWithEmptyFilename && this.state.isValidWithParse;
  }

  public render(): JSX.Element{
    if(this.state.isLoaded){
      return(
        <Layout>
          <EnableSaveAsField isOn={this.state.enableOpenSaveAs} onClick={() => this.setState({enableOpenSaveAs: !this.state.enableOpenSaveAs})}/>
          <DownloadToField
            isValidWithEmptyFilename={this.state.isValidWithEmptyFilename}
            isValidWithParse={this.state.isValidWithParse}
            value={this.state.dirnameDownloadTo}
            onChange={v => this.onChangeFilename(v)} />
          <SaveButton disabled={!this.canSave} onClick={()=>this.saveOptions()} />
        </Layout>
      );
    }
    else{
      return(
        <Layout>
          <Spinner />
        </Layout>
      );
    }
  }
}