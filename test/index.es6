import AnimatedPanel from './../index.es6';
import React from 'react/addons';
const TestUtils = React.addons.TestUtils;
describe('AnimatedPanel', () => {
  it('is compatible with React.Component', () => {
    AnimatedPanel.should.be.a('function')
      .and.respondTo('render');
  });

  it('renders a React element', () => {
    React.isValidElement(<AnimatedPanel/>).should.equal(true);
  });


  describe('when component is unmounted', () => {

   it('calls cleanupEventListeners', () => {
     const instance = new AnimatedPanel();
     console.log(instance);
     chai.spy.on(instance, 'cleanupEventListeners');
     instance.componentWillUnmount();
     instance.cleanupEventListeners
       .should.have.been.called.exactly(1);
   });
 });


  describe('when component did mount', () => {
    let instance = null;
    let window = {};

    beforeEach(() => {
      instance = new AnimatedPanel();
      instance.refs = {};
      window.addEventListener = chai.spy('addEventListener');
      // chai.spy.on(instance, 'generateAd');
      instance.generateAd  = chai.spy('generateAd');
      // chai.spy.on(instance, 'showElementWhenInView');
      instance.showElementWhenInView  = chai.spy('showElementWhenInView');
    });

    it('calls generateAd if state.tagId is truthy', () => {
      instance.state = { tagId: true };
      instance.componentDidMount();
      instance.generateAd
        .should.have.been.called.exactly(1);
    });

    it('does not call generateAd if state.tagId is falsey', () => {
      instance.state = { tagId: false };
      instance.componentDidMount();
      instance.generateAd
        .should.not.have.been.called();
    });

    it('binds showElementWhenInView to window scroll event', () => {
      instance.componentDidMount();
      window.addEventListener
        .should.have.been.called.with('scroll', instance.showElementWhenInView);
    });

    it('binds showElementWhenInView to window resize event', () => {
      instance.componentDidMount();
      window.addEventListener
        .should.have.been.called.with('resize', instance.showElementWhenInView);
    });

    it('calls showElementWhenInView', () => {
      instance.componentDidMount();
      instance.showElementWhenInView
        .should.have.been.called.exactly(1);
    });
  });




  // describe('componentDidMount', () => {

  //   it('calls generateAd', () => {
  //     // console.log(chai.spy);
  //     chai.spy.on(AnimatedPanel.prototype, 'generateAd');

  //     const element = React.createElement(AnimatedPanel);
  //     element.type.prototype.componentDidMount.call(element);

  //     element.type.prototype.generateAd
  //       .should.have.been.called();
  //   });

  //   it('adds showElementWhenInView() to scroll event listener', () => {
  //     chai.spy.on(Object.getPrototypeOf(window), 'addEventListener');

  //     const element = React.createElement(AnimatedPanel);
  //     element.componentDidMount();

  //     window.addEventListener
  //       .should.have.been.called.with('scroll', element.showElementWhenInView);
  //   });

  //   it('adds showElementWhenInView() to resize event listener', () => {
  //     chai.spy.on(Object.getPrototypeOf(window), 'addEventListener');

  //     const element = React.createElement(AnimatedPanel);
  //     element.componentDidMount();

  //     window.addEventListener
  //       .should.have.been.called.with('resize', element.showElementWhenInView);
  //   });

  //   it('calls showElementWhenInView', () => {
  //     const element = React.createElement(AnimatedPanel);
  //     chai.spy.on(element, 'showElementWhenInView');
  //     element.componentDidMount();

  //     element.showElementWhenInView
  //       .should.have.been.called();
  //   });

  // });


});

// import AnimatedPanel from '..';
// import React from 'react';

// describe('AnimatedPanel', () => {

//   it('should exist', () => {
//     AnimatedPanel.should.be.a('function');
//   });

//   it('renders a component', () => {
//     (<AnimatedPanel/>).should.be.an('object');
//   });

//   it('is a react component', () => {
//     (new AnimatedPanel()).should.be.an.instanceOf(React.Component);
//   });

//   describe('componentDidMount', () => {

//     it('calls generateAd', () => {
//       // console.log(chai.spy);
//       chai.spy.on(AnimatedPanel.prototype, 'generateAd');

//       const element = React.createElement(AnimatedPanel);
//       element.type.prototype.componentDidMount.call(element);

//       element.type.prototype.generateAd
//         .should.have.been.called();
//     });

//     it('adds showElementWhenInView() to scroll event listener', () => {
//       chai.spy.on(Object.getPrototypeOf(window), 'addEventListener');

//       const element = React.createElement(AnimatedPanel);
//       element.componentDidMount();

//       window.addEventListener
//         .should.have.been.called.with('scroll', element.showElementWhenInView);
//     });

//     it('adds showElementWhenInView() to resize event listener', () => {
//       chai.spy.on(Object.getPrototypeOf(window), 'addEventListener');

//       const element = React.createElement(AnimatedPanel);
//       element.componentDidMount();

//       window.addEventListener
//         .should.have.been.called.with('resize', element.showElementWhenInView);
//     });

//     it('calls showElementWhenInView', () => {
//       const element = React.createElement(AnimatedPanel);
//       chai.spy.on(element, 'showElementWhenInView');
//       element.componentDidMount();

//       element.showElementWhenInView
//         .should.have.been.called();
//     });

//   });

//   describe('cleanupEventListeners', () => {

//     it('removes showElementWhenInView() to scroll event listener', () => {
//       chai.spy.on(Object.getPrototypeOf(window), 'removeEventListener');

//       const element = React.createElement(AnimatedPanel);
//       element.cleanupEventListeners();

//       window.removeEventListener
//         .should.have.been.called.with('scroll', element.showElementWhenInView);
//     });

//     it('removes showElementWhenInView() to resize event listener', () => {
//       chai.spy.on(Object.getPrototypeOf(window), 'removeEventListener');

//       const element = React.createElement(AnimatedPanel);
//       element.cleanupEventListeners();

//       window.removeEventListener
//         .should.have.been.called.with('resize', element.showElementWhenInView);
//     });

//   });

//   describe('componentWillUnmount', () => {

//     it('call cleanupEventListeners', () => {
//       chai.spy.on(AnimatedPanel.prototype, 'cleanupEventListeners');

//       const element = React.createElement(AnimatedPanel);
//       element.componentWillUnmount();

//       element.cleanupEventListeners
//         .should.have.been.called();
//     });

//   });

//   describe('showElementWhenInView', () => {


//   });

// });