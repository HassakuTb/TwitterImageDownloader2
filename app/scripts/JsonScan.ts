/**
 * Scan X's data text for objects that hold a key, without parsing the whole text.
 * Used for GraphQL responses (JSON, possibly cut in the middle) and x-web inline scripts.
 *
 * No dependency on chrome api; shared by the page-world script and tests.
 */

/**
 * Objects holding `key` in JSON text, even when the text is cut in the middle
 * (a chunk of a streamed response). Each enclosing object of the key is parsed on its own;
 * nested matches come before their parents.
 */
export function objectsWithKeyInJsonText(text: string, key: string): any[] {
	const found: any[] = [];
	const quoted = `"${key}"`;
	if (text.indexOf(quoted) < 0) return found;

	const starts: number[] = [];          // positions of open "{" / "["
	const candidates: boolean[] = [];     // the object holds the key
	for (let i = 0; i < text.length; i++) {
		const c = text.charCodeAt(i);
		if (c === 0x22) {   // "
			let j = i + 1;
			while (j < text.length) {
				const d = text.charCodeAt(j);
				if (d === 0x5c) j += 2;         // backslash
				else if (d === 0x22) break;
				else j++;
			}
			if (j - i === quoted.length - 1 && text.substr(i, quoted.length) === quoted && candidates.length > 0) {
				candidates[candidates.length - 1] = true;
			}
			i = j;
		}
		else if (c === 0x7b || c === 0x5b) {   // { [
			starts.push(i);
			candidates.push(false);
		}
		else if (c === 0x7d || c === 0x5d) {   // } ]
			const start = starts.pop();
			const isCandidate = candidates.pop();
			if (start !== undefined && isCandidate === true) {
				try {
					found.push(JSON.parse(text.slice(start, i + 1)));
				}
				catch (e) { /* not a complete object */ }
			}
		}
	}
	return found;
}

/**
 * JavaScript string literals in an inline <script> of x-web (TanStack Router streaming, "$_TSR" / "$R[...]")
 * that contain `word`, decoded once (the GraphQL responses are JSON escaped once more: \").
 */
export function decodedLiteralsWith(script: string, word: string): string[] {
	const found: string[] = [];
	if (script.indexOf(word) < 0) return found;

	const literal = /"((?:[^"\\\n]|\\.)*)"/g;
	let m: RegExpExecArray | null;
	while ((m = literal.exec(script)) !== null) {
		if (m[1].indexOf(word) < 0) continue;
		try {
			found.push(JSON.parse(`"${m[1]}"`));
		}
		catch (e) { /* not a JSON string */ }
	}
	return found;
}
