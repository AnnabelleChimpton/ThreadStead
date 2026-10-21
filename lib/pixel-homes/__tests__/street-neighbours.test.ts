import { withNeighbours, type StreetHome } from '../street';

const home = (number: number): StreetHome => ({
  userId: `u${number}`,
  username: `h${number}`,
  displayName: null,
  number,
  snapshotCardUrl: null,
  houseTemplate: 'cottage_v1',
  palette: 'thread_sage',
  houseCustomizations: {},
  decorationCount: 0,
});

const numbers = (homes: StreetHome[]) => homes.map((h) => h.number);

describe('withNeighbours', () => {
  it('takes one neighbour each side', () => {
    expect(numbers(withNeighbours([1, 2, 3, 4, 5].map(home), 'u3'))).toEqual([2, 3, 4]);
  });

  it('gives the newest resident the two houses before theirs', () => {
    expect(numbers(withNeighbours([1, 2, 3, 4].map(home), 'u4'))).toEqual([2, 3, 4]);
  });

  it('gives the first house on a street the two after it', () => {
    expect(numbers(withNeighbours([25, 26, 27].map(home), 'u25'))).toEqual([25, 26, 27]);
  });

  it('skips gaps left by homes the viewer may not see', () => {
    expect(numbers(withNeighbours([3, 7, 9, 12].map(home), 'u9'))).toEqual([7, 9, 12]);
  });

  it('is just their house when nobody else is on the street', () => {
    expect(numbers(withNeighbours([home(25)], 'u25'))).toEqual([25]);
  });

  it('is empty when they are not on it', () => {
    expect(withNeighbours([home(1)], 'u9')).toEqual([]);
  });
});
