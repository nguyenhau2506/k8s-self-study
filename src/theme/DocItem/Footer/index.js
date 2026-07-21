import React from 'react';
import Footer from '@theme-original/DocItem/Footer';
import MarkComplete from '@site/src/components/MarkComplete';
import Comments from '@site/src/components/Comments';

// Wrap the original doc footer: "Đánh dấu đã học" control + Giscus comments.
export default function FooterWrapper(props) {
  return (
    <>
      <MarkComplete />
      <Footer {...props} />
      <Comments />
    </>
  );
}
