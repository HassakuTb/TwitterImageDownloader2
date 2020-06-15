import * as React from 'react';
import { Component } from 'react';
import styled from 'styled-components';
import { SaveButton } from './SaveButton';
import { Spinner } from './Spinner';
import { DownloadToField } from './DownloadToField';
import { EnableSaveAsField } from './EnableSaveAsField';

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;

  width: 600px;
`;

const defaultDirnameDownloadTo: string = 'TwitterImageDLer';
const defaultEnableOpenSaveAs: boolean = false;

interface OptionState{
  isLoaded: boolean;
  dirnameDownloadTo: string;
  enableOpenSaveAs: boolean;
}

export class OptionsForm extends Component<any, OptionState>{

  constructor(props: any){
    super(props);

    this.state = {
      isLoaded : false,
      dirnameDownloadTo: defaultDirnameDownloadTo,
      enableOpenSaveAs: defaultEnableOpenSaveAs,
    }
  }

  private saveOptions(): void{
    this.setState({isLoaded: false});

    chrome.storage.local.set({
      download_to: this.state.dirnameDownloadTo,
      open_save_as: this.state.enableOpenSaveAs,
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
      open_save_as : defaultEnableOpenSaveAs
    }, (items: {[key: string]: any}) => {
      this.setState({
        isLoaded: true,
        dirnameDownloadTo: items.download_to,
        enableOpenSaveAs: items.open_save_as,
      });
    });
  }

  componentDidMount(){
    this.restoreOptions();
  }

  public render(): JSX.Element{
    if(this.state.isLoaded){
      return(
        <Layout>
          <DownloadToField value={this.state.dirnameDownloadTo} onChange={v => this.setState({dirnameDownloadTo: v})} />
          <EnableSaveAsField isOn={this.state.enableOpenSaveAs} onClick={() => this.setState({enableOpenSaveAs: !this.state.enableOpenSaveAs})}/>
          <SaveButton onClick={()=>this.saveOptions()} />
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