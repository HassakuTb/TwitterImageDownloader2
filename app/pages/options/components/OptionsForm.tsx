import * as React from 'react';
import { Component } from 'react';
import styled from 'styled-components';
import { SaveButton } from './SaveButton';
import { Spinner } from './Spinner';
import { DownloadToField } from './DownloadToField';
import { EnableSaveAsField } from './EnableSaveAsField';
import { ContextMenuFields } from './ContextMenuFields';
import { AppColor } from '../Colors';
import { ReadContextMenuSetting, DefaultShiftNativeMenu, DefaultOverrideContextMenu } from '../../../scripts/Setting';
import { CreateDefaultSetting, Setting, IsLatestDataVersion, MigrateSetting1to2, TagUserId, TagTweetId, TagImageIndex, TagOriginal, TagExtension, TagUserName} from '../../../scripts/Setting';
import { TagYear, TagMonth, TagDay, TagHour, TagMin, TagSec } from '../../../scripts/Setting';
import { TagPostYear, TagPostMonth, TagPostDay, TagPostHour, TagPostMin, TagPostSec } from '../../../scripts/Setting';

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;

  width: 800px;
`;

// Pinned to the bottom of the options view so Save is visible without scrolling.
// The negative side margins cancel the page padding so scrolled content does not show beside it.
const Footer = styled.div`
  position: sticky;
  bottom: 0;
  align-self: stretch;

  margin: 0 -40px;
  padding: 12px 40px 20px;

  background: white;
  border-top: 1px solid ${AppColor.placeholder};
`;

const defaultDirnameDownloadTo: string = 'Twitter';
const defaultEnableOpenSaveAs: boolean = false;

interface OptionState{
  isLoaded: boolean;
  dirnameDownloadTo: string;
  enableOpenSaveAs: boolean;
  shiftNativeMenu: boolean;
  overrideContextMenu: boolean;
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
      ...ReadContextMenuSetting({}),
      isValidWithEmptyFilename: false,
      isValidWithParse: false,
    }
  }

  private saveOptions(): void{
    this.setState({isLoaded: false});

    chrome.storage.local.set({
      download_to: this.state.dirnameDownloadTo,
      open_save_as: this.state.enableOpenSaveAs,
      shift_native_menu: this.state.shiftNativeMenu,
      override_context_menu: this.state.overrideContextMenu,
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
      shift_native_menu : DefaultShiftNativeMenu,
      override_context_menu : DefaultOverrideContextMenu,
      data_version : 1,
    }, (items: any) => {
      
      let setting: Setting = (items.download_to === undefined || items.download_to === null) ?
        CreateDefaultSetting() : (items as Setting);
  
      if(!IsLatestDataVersion(setting)){
        setting = MigrateSetting1to2(setting);
      }
      const menuSetting = ReadContextMenuSetting(items as Setting);

      this.setState({
        isLoaded: true,
        dirnameDownloadTo: setting.download_to!,
        enableOpenSaveAs: setting.open_save_as!,
        shiftNativeMenu: menuSetting.shiftNativeMenu,
        overrideContextMenu: menuSetting.overrideContextMenu,
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
    s = s.replace(TagUserName, "");
    s = s.replace(TagTweetId, "");
    s = s.replace(TagImageIndex, "");
    s = s.replace(TagOriginal, "");
    s = s.replace(TagExtension, "");
    s = s.replace(TagYear, "");
    s = s.replace(TagMonth, "");
    s = s.replace(TagDay, "");
    s = s.replace(TagHour, "");
    s = s.replace(TagMin, "");
    s = s.replace(TagSec, "");
    s = s.replace(TagPostYear, "");
    s = s.replace(TagPostMonth, "");
    s = s.replace(TagPostDay, "");
    s = s.replace(TagPostHour, "");
    s = s.replace(TagPostMin, "");
    s = s.replace(TagPostSec, "");
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
          <ContextMenuFields
            shiftNativeMenu={this.state.shiftNativeMenu}
            overrideContextMenu={this.state.overrideContextMenu}
            onClickShiftNativeMenu={() => this.setState({shiftNativeMenu: !this.state.shiftNativeMenu})}
            onClickOverrideContextMenu={() => this.setState({overrideContextMenu: !this.state.overrideContextMenu})} />
          <DownloadToField
            isValidWithEmptyFilename={this.state.isValidWithEmptyFilename}
            isValidWithParse={this.state.isValidWithParse}
            value={this.state.dirnameDownloadTo}
            onChange={v => this.onChangeFilename(v)} />
          <Footer>
            <SaveButton disabled={!this.canSave} onClick={()=>this.saveOptions()} />
          </Footer>
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
