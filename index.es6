import React from 'react';

/* global window: false */
/* global document: false */
export default class AdPanel extends React.Component {

  static get propTypes() {
    return {
      animated: React.PropTypes.bool,
      adTag: React.PropTypes.string,
      lazyLoad: React.PropTypes.bool,
      lazyLoadMargin: React.PropTypes.number,
      sizes: React.PropTypes.arrayOf(React.PropTypes.array),
      reserveHeight: React.PropTypes.number,
      styled: React.PropTypes.bool,
    };
  }

  static get defaultProps() {
    return {
      animated: true,
      lazyLoad: true,
      lazyLoadMargin: 350,
      sizes: [ [ 60, 60 ], [ 70, 70 ], [ 300, 250 ], [ 1024, 768 ] ],
      styled: true,
    };
  }

  constructor(...args) {
    super(...args);
    this.loadElementWhenInView = this.loadElementWhenInView.bind(this);
  }

  componentWillMount() {
    this.setState({
      tagId: `googlead-${(Math.random() * 1e17) .toString(16)}`,
      adGenerated: false,
    });
  }

  componentDidMount() {
    if (this.state && this.state.tagId) {
      /* global window document */
      if (typeof window !== 'undefined' && window.document &&
          !window.googletag) {
        window.googletag = { cmd: [] };
        const gads = document.createElement('script');
        gads.async = true;
        gads.type = 'text/javascript';
        const useSsl = window.location.protocol === 'https:';
        gads.src = `${useSsl ? 'https:' : 'http:'}//www.googletagservices.com/tag/js/gpt.js`;
        document.head.appendChild(gads);
      }
    }
    if (!this.props.lazyLoad && this.state && this.state.tagId && !this.state.adGenerated) {
      this.generateAd();
    }
    window.addEventListener('scroll', this.loadElementWhenInView);
    window.addEventListener('resize', this.loadElementWhenInView);
    this.loadElementWhenInView();
  }

  componentWillUnmount() {
    this.cleanupEventListeners();
  }

  isElementInViewport(elm, margin = 0) {
    const rect = React.findDOMNode(elm).getBoundingClientRect();
    return rect.bottom > -margin &&
      rect.right > -margin &&
      rect.left < (window.innerWidth || document.documentElement.clientWidth) + margin &&
      rect.top < (window.innerHeight || document.documentElement.clientHeight) + margin;
  }

  loadElementWhenInView() {
    const containerElement = this.refs.container;
    if (!this.state.adGenerated &&
        this.props.lazyLoad &&
        this.isElementInViewport(containerElement, this.props.lazyLoadMargin)) {
      this.generateAd();
    }
    if (this.isElementInViewport(containerElement) === true) {
      const targetContainerElement = React.findDOMNode(containerElement);
      targetContainerElement.className += ' ad-panel--visible';
      this.cleanupEventListeners();
    }
  }

  cleanupEventListeners() {
    window.removeEventListener('scroll', this.loadElementWhenInView);
    window.removeEventListener('resize', this.loadElementWhenInView);
  }

  generateAd() {
    this.setState({ adGenerated: true });
    if ((window.googletag) && (this.props.adTag)) {
      const googleTag = window.googletag;
      googleTag.cmd.push(() => {
        const mappingAd = window.googletag.sizeMapping()
          .addSize([ 980, 200 ], [ 1024, 768 ])
          .addSize([ 0, 0 ], [ 300, 250 ])
          .build();
        const slot = googleTag.defineSlot(
          this.props.adTag,
          this.props.sizes,
          this.state.tagId)
          .setTargeting('resp_mpu_inline_ad', 'refresh')
          .addService(googleTag.pubads());
        if (this.props.sizes && this.props.sizes.length > 1) {
          slot.defineSizeMapping(mappingAd);
        }
        googleTag.pubads().enableSingleRequest();
        googleTag.enableServices();
        googleTag.display(this.state.tagId);
      });
    } else {
      const adToHide = React.findDOMNode(this.refs.container);
      adToHide.style.display = 'none';
      /* eslint-disable no-console */
      if (typeof console !== 'undefined' && console.error) {
        console.error('window.googletag not present, please put googletag js into html');
      }
    }
  }

  render() {
    let tag = [];
    if (this.state && this.state.tagId) {
      let adStyle = {};
      if (this.props.reserveHeight) {
        adStyle = { minHeight: this.props.reserveHeight };
      }
      tag = (<div className="ad-panel__googlead" id={this.state.tagId} style={adStyle}></div>);
    }
    let rootClassNames = [ 'ad-panel__container' ];
    let title = [];
    if (this.props.styled) {
      rootClassNames = rootClassNames.concat([ 'ad-panel__container--styled' ]);
      title = (<span ref="title" className="ad-panel__title">Advertisement</span>);
    }
    if (this.props.animated) {
      rootClassNames = rootClassNames.concat([ 'ad-panel__animated' ]);
    }
    const aria = {
      role: 'complementary',
      itemscope: 'https://schema.org/WPAdBlock',
    };
    return (
      <div ref="container" className={rootClassNames.join(' ')} {...aria}>
        {title}
        {tag}
      </div>
    );
  }
}
