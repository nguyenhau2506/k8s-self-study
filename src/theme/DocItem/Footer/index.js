import React from 'react';
import Footer from '@theme-original/DocItem/Footer';
import MarkComplete from '@site/src/components/MarkComplete';

// Wrap the original doc footer to add a "Đánh dấu đã học" control on every doc.
export default function FooterWrapper(props) {
  return (
    <>
      <MarkComplete />
      <Footer {...props} />
    </>
  );
}
