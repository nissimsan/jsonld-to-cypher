const {Cypher, GraphViz} = require('..');
const fixtures = require('../__fixtures__');

jest.setTimeout(10 * 1000);

it('tests', async () => {
  const c1 = await Cypher.fromDocument(fixtures.revocableCredential);
  // console.log(c1);
  expect(c1).toBeDefined();

  const c2 = await Cypher.fromJsonWebSignature(fixtures.jws);
  // console.log(c2);
  expect(c2).toBeDefined();

  const d1 = await GraphViz.fromJsonWebSignature(fixtures.jws);
  // console.log(d1);
  expect(d1).toBeDefined();
});

afterAll((done) => {
  setTimeout(done, 0);
});
