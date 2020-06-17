import { PureComponent } from "react";
import React from "react";
import styled, { keyframes } from "styled-components";
import { AppColor } from "../Colors";

const Gradient = keyframes`
  0%,
  80%,
  100% {
    background-color: ${AppColor.primaryTrans};
  }
  40% {
    background-color: ${AppColor.primary}
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const Bar1 = styled.div`
  width: 8px;
  height: 40px;

  animation: ${Gradient} 1.4s infinite ease-in-out both;
  animation-delay: -0.32s;
`;

const Bar2 = styled.div`
  width: 8px;
  height: 40px;

  animation: ${Gradient} 1.4s infinite ease-in-out both;
  animation-delay: -0.16s;

  margin-left: 8px;
`;

const Bar3 = styled.div`
  width: 8px;
  height: 40px;

  animation: ${Gradient} 1.4s infinite ease-in-out both;

  margin-left: 8px;
`;

export class Spinner extends PureComponent{

  public render(): JSX.Element{
    return(
      <Container>
        <Bar1 />
        <Bar2 />
        <Bar3 />
      </Container>
    );
  }
}