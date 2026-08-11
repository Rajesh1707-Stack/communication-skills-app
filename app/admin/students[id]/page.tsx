<td className="px-4 py-5">
  <div className="flex flex-wrap gap-2">

    <button
      onClick={() =>
        viewStudent(student)
      }
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
    >
      View
    </button>

    <button
      onClick={() =>
        (window.location.href =
          `/admin/students/${student.id}/progress`)
      }
      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
    >
      📈 Progress
    </button>

  </div>
</td>