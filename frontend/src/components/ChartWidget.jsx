import React, { useState, useEffect } from 'react';
import { useStockWidget } from './useStockWidget';
import ChartWidgetMobile from './ChartWidget_Mobile';
import ChartWidgetDesktop from './ChartWidget_Desktop';

/**
 * ChartWidget 메인 컨테이너
 * 화면 크기에 따라 Mobile/Desktop 뷰를 동적으로 전환합니다.
 * v11.2 원본 디자인을 100% 유지하며 파일만 분리되었습니다.
 */
const ChartWidget = (props) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  // 비즈니스 로직 분리 (커스텀 훅)
  const logic = useStockWidget(props.stock, props.currentPeriod);

  // 화면 리사이즈 감지 최적화
  useEffect(() => {
    let timeoutId = null;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth < 1024);
      }, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // 분기 렌더링 (디자인 보존을 위해 props와 logic을 모두 전달)
  if (isMobile) {
    return <ChartWidgetMobile {...props} logic={logic} />;
  }

  return <ChartWidgetDesktop {...props} logic={logic} />;
};

export default ChartWidget;
