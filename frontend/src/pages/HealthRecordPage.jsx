import { useState } from 'react';
import { healthRecordApi } from '../api/healthRecordApi.js';

export default function HealthRecordPage() {
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function loadTodayRecord() {
    setStatus('loading');
    setError('');

    try {
      const response = await healthRecordApi.getToday();
      setData(response);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Failed to fetch health record');
    }
  }

  return (
    <section className="card">
      <h2>Health Record</h2>
      <p>백엔드 `GET /api/v1/health-record/today` 연동용 기본 페이지입니다.</p>
      <button type="button" className="button-link" onClick={loadTodayRecord}>
        Load Today Record
      </button>

      {status === 'loading' && <p className="status">Loading...</p>}
      {status === 'error' && <p className="status error">{error}</p>}

      {status === 'success' && (
        <pre className="json-view">{JSON.stringify(data, null, 2)}</pre>
      )}
    </section>
  );
}
