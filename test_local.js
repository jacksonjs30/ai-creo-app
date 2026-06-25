fetch('http://localhost:5177/api/feedback-loop/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'test',
    dateFrom: '2026-06-01',
    dateTo: '2026-06-07'
  })
}).then(r => r.json()).then(data => {
  fetch('http://localhost:5177/api/feedback-loop/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aggregatedData: data })
  }).then(async r => {
    console.log(r.status);
    console.log(await r.text());
  });
});
