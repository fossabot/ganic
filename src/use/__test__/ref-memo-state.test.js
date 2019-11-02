'use strict';

const {create} = require('../../Ganic');

const {useRef, useMemo, useState} = require('..');

describe('should always keep identity from parasite', () => {
  it('should only call fn while deps change with useMemo', () => {
    const times2 = n => n * 2;

    const parasitismMockFn = jest.fn();
    const times2WithMockFn = n => {
      const result = times2(n);
      parasitismMockFn(result);
      return result;
    };
    const organism = ({count}) => {
      const memorizedDoubleCountResult = useMemo(times2WithMockFn, count);
      expect(memorizedDoubleCountResult).toBe(times2(count));
      return memorizedDoubleCountResult;
    };

    const organismMockFn = jest.fn();
    create({organism, props: {count: 1, random: Math.random()}})
      .addListener(organismMockFn)
      .receive({count: 1, random: Math.random()})
      .receive({count: 1, random: Math.random()})
      .receive({count: 2, random: Math.random()});

    expect(parasitismMockFn.mock.calls).toEqual([
      [2],
      [4],
    ]);

    expect(organismMockFn.mock.calls).toEqual([
      [2],
      [2],
      [2],
      [4],
    ]);
  });

  it('should always get permanent unique ref from useRef', () => {
    let lastARef;
    const organism = () => {
      const aRef = useRef();
      expect(!lastARef || lastARef === aRef).toEqual(true);
      lastARef = aRef;

      const bRef = useRef();
      expect(aRef).not.toBe(bRef);
    };

    create({organism, props: 1}).receive(2).receive(3);
  });

  it('should always get permanent unique setState from useState', () => {
    let lastSetA;
    const organism = () => {
      const [, setA] = useState();
      expect(!lastSetA || lastSetA === setA).toEqual(true);
      lastSetA = setA;

      const [, setB] = useState();
      expect(setA).not.toBe(setB);
    };

    create({organism, props: 1}).receive(2).receive(3);
  });
});
