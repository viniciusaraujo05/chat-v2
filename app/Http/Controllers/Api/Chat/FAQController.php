<?php

namespace App\Http\Controllers\Api\Chat;

use App\Models\FAQ;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class FAQController extends Controller
{
    public function index()
    {
        return FAQ::all();
    }

    public function show($id)
    {
        return FAQ::findOrFail($id);
    }

    public function store(Request $request)
    {
        $request->validate([
            'question' => 'required|string',
            'answer' => 'required|string',
        ]);

        return FAQ::create($request->all());
    }

    public function update(Request $request, $id)
    {
        $faq = FAQ::findOrFail($id);
        $faq->update($request->all());

        return $faq;
    }

    public function destroy($id)
    {
        FAQ::destroy($id);

        return response()->noContent();
    }
}
