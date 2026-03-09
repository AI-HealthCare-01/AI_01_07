import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/adminApi.js';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [size] = useState(20);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / size));

  const fetchUsers = async (nextPage = page, nextQuery = query) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.listUsers({ page: nextPage, size, q: nextQuery });
      setUsers(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || nextPage);
    } catch (err) {
      setError(err?.response?.data?.detail || '회원 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const onSearch = (e) => {
    e.preventDefault();
    setQuery(input.trim());
  };

  return (
    <section className="stack">
      <article className="card">
        <div className="card-head">
          <h2>관리자 회원 목록</h2>
          <Link to="/profile" className="pill-btn">
            프로필로
          </Link>
        </div>
        <form className="form-inline" onSubmit={onSearch}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="이름/이메일/전화번호 검색"
          />
          <button type="submit" className="pill-btn">
            검색
          </button>
        </form>
        {error && <p className="status">{error}</p>}
      </article>

      <article className="card">
        <p className="muted">총 {total}명</p>
        {loading ? (
          <p className="muted">불러오는 중...</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>전화번호</th>
                  <th>권한</th>
                  <th>활성</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6}>조회 결과가 없습니다.</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.phone_number}</td>
                      <td>{user.is_admin ? '관리자' : '일반'}</td>
                      <td>{user.is_active ? '활성' : '비활성'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="pager">
          <button type="button" className="pill-btn" disabled={page <= 1} onClick={() => fetchUsers(page - 1, query)}>
            이전
          </button>
          <span className="muted">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="pill-btn"
            disabled={page >= totalPages}
            onClick={() => fetchUsers(page + 1, query)}
          >
            다음
          </button>
        </div>
      </article>
    </section>
  );
}
