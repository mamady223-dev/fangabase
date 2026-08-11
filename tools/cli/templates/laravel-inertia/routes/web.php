<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => redirect('/dashboard'));
Route::get('/dashboard', fn () => Inertia::render('Dashboard'));
