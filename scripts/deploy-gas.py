#!/usr/bin/env python3
import json
import pathlib
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
GAS = ROOT / 'gas'
SCRIPT_ID = '1RVkCuepMZdC17Qw-M_Fm4wW_7jG1_4MnnMz_wAZIfdvYt_3PcPLJbqFG'
RC_PATH = pathlib.Path('/config/.clasprc.json')


def request(url, token, method='GET', payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method=method, headers={
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
    })
    with urllib.request.urlopen(req, timeout=90) as response:
        return json.loads(response.read().decode() or '{}')


def refresh_token():
    rc = json.loads(RC_PATH.read_text())
    credentials = rc['tokens']['default']
    form = urllib.parse.urlencode({
        'grant_type': 'refresh_token',
        'client_id': credentials['client_id'],
        'client_secret': credentials['client_secret'],
        'refresh_token': credentials['refresh_token'],
    }).encode()
    req = urllib.request.Request('https://oauth2.googleapis.com/token', data=form, method='POST')
    with urllib.request.urlopen(req, timeout=30) as response:
        credentials['access_token'] = json.loads(response.read().decode())['access_token']
    RC_PATH.write_text(json.dumps(rc, indent=2))
    return credentials['access_token']


def build_files():
    result = []
    for path in sorted(GAS.iterdir()):
        if path.name == 'appsscript.json':
            result.append({'name': 'appsscript', 'type': 'JSON', 'source': path.read_text()})
        elif path.suffix == '.gs':
            result.append({'name': path.stem, 'type': 'SERVER_JS', 'source': path.read_text()})
        elif path.suffix == '.html':
            result.append({'name': path.stem, 'type': 'HTML', 'source': path.read_text()})
    return result


def main():
    token = refresh_token()
    base = f'https://script.googleapis.com/v1/projects/{SCRIPT_ID}'
    files = build_files()
    request(base + '/content', token, 'PUT', {'files': files})
    version = request(base + '/versions', token, 'POST', {'description': 'Cloudflare route provisioner'})
    deployments = request(base + '/deployments', token).get('deployments', [])
    web_apps = [
        item for item in deployments
        if item.get('entryPoints') and item.get('deploymentConfig', {}).get('versionNumber')
    ]
    if not web_apps:
        deployment = request(base + '/deployments', token, 'POST', {
            'versionNumber': version['versionNumber'],
            'manifestFileName': 'appsscript',
            'description': 'Cloudflare route provisioner',
        })
    else:
        deployment = web_apps[0]
        deployment_id = deployment['deploymentId']
        deployment = request(base + '/deployments/' + deployment_id, token, 'PUT', {
            'deploymentConfig': {
                'versionNumber': version['versionNumber'],
                'manifestFileName': 'appsscript',
                'description': 'Cloudflare route provisioner',
            }
        })
    print(json.dumps({
        'ok': True,
        'scriptId': SCRIPT_ID,
        'versionNumber': version['versionNumber'],
        'deploymentId': deployment.get('deploymentId'),
        'files': [item['name'] for item in files],
    }))


if __name__ == '__main__':
    main()
