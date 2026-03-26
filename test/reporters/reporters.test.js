'use strict';

var { expect } = require('chai');

var baseReporter = require('../../lib/reporters/base-reporter');
var jsonReporter = require('../../lib/reporters/json-reporter');
var textReporter = require('../../lib/reporters/text-reporter');
var mdReporter   = require('../../lib/reporters/markdown-reporter');

// Minimal section set for all three reporters
var SECTIONS = [
  { type: 'heading', level: 2, text: 'Overview' },
  { type: 'kv', pairs: [['Total', '42'], ['Date', '2024-01-01']] },
  { type: 'table', headers: ['Name', 'Count'], rows: [['Alice', '10'], ['Bob', '5']], aligns: ['left', 'right'] },
  { type: 'list', items: ['Item one', 'Item two'] },
  { type: 'ranked', items: [{ rank: 1, label: 'hello', value: '5' }, { rank: 2, label: 'world', value: '3' }] },
  { type: 'blank' },
  { type: 'divider' },
  { type: 'text', text: 'Some plain text.' },
  { type: 'callout', label: 'Insight', text: 'Key finding here.' },
];

var META = {
  title: 'Test Report',
  message_count: 42,
  date_range: { first: '2024-01-01T00:00:00', last: '2024-12-31T23:59:59' },
  generated_at: '2024-01-01T00:00:00.000Z',
};

// -------------------------------------------------------------------------
// base-reporter helpers
// -------------------------------------------------------------------------
describe('base-reporter helpers', function () {

  describe('formatDate()', function () {
    it('formats a valid ISO string', function () {
      expect(baseReporter.formatDate('2024-06-15T00:00:00')).to.equal('Jun 15, 2024');
    });
    it('returns em-dash for null/empty', function () {
      expect(baseReporter.formatDate(null)).to.equal('—');
      expect(baseReporter.formatDate('')).to.equal('—');
    });
    it('accepts a custom format token', function () {
      expect(baseReporter.formatDate('2024-06-15T00:00:00', 'yyyy')).to.equal('2024');
    });
  });

  describe('formatNumber()', function () {
    it('adds thousands separators', function () {
      expect(baseReporter.formatNumber(12345)).to.equal('12,345');
    });
    it('returns em-dash for null/NaN', function () {
      expect(baseReporter.formatNumber(null)).to.equal('—');
      expect(baseReporter.formatNumber(NaN)).to.equal('—');
    });
  });

  describe('formatDuration()', function () {
    it('formats sub-hour as minutes', function () {
      expect(baseReporter.formatDuration(30)).to.equal('30m');
    });
    it('formats 90 minutes as 1h 30m', function () {
      expect(baseReporter.formatDuration(90)).to.equal('1h 30m');
    });
    it('returns em-dash for null', function () {
      expect(baseReporter.formatDuration(null)).to.equal('—');
    });
  });

  describe('sparkline()', function () {
    it('returns a string of block chars', function () {
      var s = baseReporter.sparkline([1, 3, 5, 2, 8]);
      expect(s).to.be.a('string').and.have.lengthOf(5);
      expect(s).to.match(/^[▁▂▃▄▅▆▇█]+$/);
    });
    it('returns empty string for empty input', function () {
      expect(baseReporter.sparkline([])).to.equal('');
    });
  });

  describe('asciiBar()', function () {
    it('returns a bar of the correct total width', function () {
      var bar = baseReporter.asciiBar(5, 10, 10);
      expect(bar).to.have.lengthOf(10);
      expect(bar).to.match(/^[█░]+$/);
    });
    it('full bar when value equals max', function () {
      expect(baseReporter.asciiBar(10, 10, 8)).to.equal('████████');
    });
    it('empty bar when value is 0', function () {
      expect(baseReporter.asciiBar(0, 10, 8)).to.equal('░░░░░░░░');
    });
  });

  describe('textTable()', function () {
    it('returns a string with all headers present', function () {
      var out = baseReporter.textTable(['Name', 'Count'], [['Alice', '10']]);
      expect(out).to.include('Name').and.include('Count').and.include('Alice');
    });
  });

  describe('mdTable()', function () {
    it('produces GFM table with pipe characters', function () {
      var out = baseReporter.mdTable(['A', 'B'], [['1', '2']]);
      expect(out).to.include('|').and.include('---');
    });
  });

  describe('mdCallout()', function () {
    it('starts with "> **Label:**" format', function () {
      var out = baseReporter.mdCallout('Some text', 'Note');
      // format is: > **Note:** text  (colon inside the bold span)
      expect(out).to.match(/^> \*\*Note:\*\*/);
    });
    it('defaults label to Insight', function () {
      expect(baseReporter.mdCallout('text')).to.include('**Insight:**');
    });
  });
});

// -------------------------------------------------------------------------
// json-reporter
// -------------------------------------------------------------------------
describe('json-reporter', function () {

  it('render() returns valid JSON', function () {
    var output = jsonReporter.render({ foo: 1 }, META);
    expect(function () { JSON.parse(output); }).to.not.throw();
  });

  it('envelope has required keys', function () {
    var env = JSON.parse(jsonReporter.render({ foo: 1 }, META));
    expect(env).to.have.all.keys(['generated_at', 'title', 'message_count', 'date_range', 'data']);
  });

  it('message_count matches meta', function () {
    var env = JSON.parse(jsonReporter.render({}, META));
    expect(env.message_count).to.equal(META.message_count);
  });

  it('date_range includes formatted field', function () {
    var env = JSON.parse(jsonReporter.render({}, META));
    expect(env.date_range.formatted).to.be.a('string').and.include('2024');
  });

  it('data field contains the passed data', function () {
    var env = JSON.parse(jsonReporter.render({ count: 99 }, META));
    expect(env.data.count).to.equal(99);
  });

  it('works without meta', function () {
    expect(function () { JSON.parse(jsonReporter.render({ x: 1 })); }).to.not.throw();
  });
});

// -------------------------------------------------------------------------
// text-reporter
// -------------------------------------------------------------------------
describe('text-reporter', function () {

  it('render() returns a non-empty string', function () {
    var out = textReporter.render(SECTIONS, META);
    expect(out).to.be.a('string').and.have.length.above(0);
  });

  it('includes the report title', function () {
    expect(textReporter.render(SECTIONS, META)).to.include('Test Report');
  });

  it('includes heading text', function () {
    // level-2 headings are not uppercased; level-1 are
    expect(textReporter.render(SECTIONS, META)).to.include('Overview');
  });

  it('includes KV pair labels', function () {
    expect(textReporter.render(SECTIONS, META)).to.include('Total');
  });

  it('includes table header', function () {
    expect(textReporter.render(SECTIONS, META)).to.include('Name');
  });

  it('renders without meta', function () {
    expect(function () { textReporter.render(SECTIONS); }).to.not.throw();
  });

  it('renders empty sections list', function () {
    expect(function () { textReporter.render([], META); }).to.not.throw();
  });
});

// -------------------------------------------------------------------------
// markdown-reporter
// -------------------------------------------------------------------------
describe('markdown-reporter', function () {

  it('render() returns a non-empty string', function () {
    var out = mdReporter.render(SECTIONS, META);
    expect(out).to.be.a('string').and.have.length.above(0);
  });

  it('starts with H1 title', function () {
    expect(mdReporter.render(SECTIONS, META)).to.match(/^# Test Report/);
  });

  it('includes H2 heading', function () {
    expect(mdReporter.render(SECTIONS, META)).to.include('## Overview');
  });

  it('includes GFM pipe table', function () {
    var out = mdReporter.render(SECTIONS, META);
    expect(out).to.include('| Name').and.include('| Count');
  });

  it('includes callout block', function () {
    // format is: > **Insight:** text  (colon inside the bold span)
    expect(mdReporter.render(SECTIONS, META)).to.include('> **Insight:**');
  });

  it('includes bullet list items', function () {
    expect(mdReporter.render(SECTIONS, META)).to.include('- Item one');
  });

  it('does not contain inline HTML', function () {
    var out = mdReporter.render(SECTIONS, META);
    expect(out).to.not.match(/<[a-z]+[\s>]/i);
  });

  it('renders without meta', function () {
    expect(function () { mdReporter.render(SECTIONS); }).to.not.throw();
  });
});
