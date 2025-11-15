import { useEffect, useState } from "react";
import axios from "axios";

interface Approval {
  _id?: string;
  title: string;
  requester: string;
  status: string;
}

export default function ApprovalPage() {
  const [list, setList] = useState<Approval[]>([]);
  const [title, setTitle] = useState("");
  const [requester, setRequester] = useState("");

  async function load() {
    const res = await axios.get("/api/approvals");
    setList(res.data);
  }

  async function add() {
    if (!title || !requester) return;
    await axios.post("/api/approvals", { title, requester });
    setTitle(""); setRequester("");
    load();
  }

  async function updateStatus(id: string, status: string) {
    await axios.patch(`/api/approvals/${id}`, { status });
    load();
  }

  async function remove(id: string) {
    await axios.delete(`/api/approvals/${id}`);
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">승인 요청 관리</h1>
      <div className="flex gap-2 mb-4">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="요청 제목" className="border px-2 py-1 rounded"/>
        <input value={requester} onChange={e => setRequester(e.target.value)} placeholder="요청자" className="border px-2 py-1 rounded"/>
        <button onClick={add} className="px-3 py-2 bg-blue-600 text-white rounded">추가</button>
      </div>
      <table className="w-full border-collapse">
        <thead><tr><th>제목</th><th>요청자</th><th>상태</th><th>조작</th></tr></thead>
        <tbody>
          {list.map(a => (
            <tr key={a._id} className="border-t">
              <td>{a.title}</td>
              <td>{a.requester}</td>
              <td>{a.status}</td>
              <td className="flex gap-2 py-1">
                <button onClick={() => updateStatus(a._id!, "승인")} className="text-green-600">승인</button>
                <button onClick={() => updateStatus(a._id!, "거절")} className="text-yellow-600">거절</button>
                <button onClick={() => remove(a._id!)} className="text-red-600">삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
