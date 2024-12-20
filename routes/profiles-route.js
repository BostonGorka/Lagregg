import http from 'http';
import { cleanupHTMLOutput, getRequestBody } from '../utilities.js';
import { dbo } from '../index.js';
import { ObjectId } from 'mongodb';
import fs from 'fs/promises';
import { connect } from 'http2';

/**
 * 
 * @param {string[]} pathSegments 
 * @param {http.IncomingMessage} request 
 * @param {http.IncomingMessage} response 
 */
export async function handleProfilesRoute(pathSegments, url, request, response) {
    let nextSegment = pathSegments.shift();

    if (!nextSegment) {

        if (request.method === 'POST') {
            let body = await getRequestBody(request);

            let params = new URLSearchParams(body);
            console.log(params)

            if (!params.get('teamName') || !params.get('City')
                || !params.get('phoneNumber')) {

                response.writeHead(400, { 'Content-Type': 'text/plain' });
                response.write('400 Bad Request');
                response.end();
                return;
            }

            let result = await dbo.collection('Teamregg').insertOne({
                'teamName': params.get('teamName'),
                'City': params.get('City'),
                'phoneNumber': params.get('phoneNumber')
            });

            response.writeHead(303, { 'Location': '/Laglista/' + result.insertedId });


            response.end();
            return;
        }

        if (request.method === 'GET') {
            let filter = {};

            if (url.searchParams.has('phoneNumber')) {
                filter.age = url.searchParams.get('phoneNumber');
            }

            if (url.searchParams.has('teamName')) {
                filter.name = url.searchParams.get('teamName');
            }



            let documents = await dbo.collection('Teamregg').find(filter).toArray();

            let profileString = '';

            for (let i = 0; i < documents.length; i++) {
                profileString += '<li><a href="/profile/' + cleanupHTMLOutput(documents[i]._id.toString()) + '">' + cleanupHTMLOutput(documents[i].teamName) + ' (' + cleanupHTMLOutput(documents[i].phoneNumber) + ')</a></li>';
            }
            let template = (await fs.readFile('templates/profiles-list.volvo')).toString();

            template = template.replaceAll('%{profilesList}%', profileString);

            response.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
            response.write(template);
            response.end();
            return;




        }
        response.writeHead(405, { 'Content-Type': 'text/plain' });
        response.write('405 Method Not Allowed');
        response.end();
        return;
    }
    if (request.method !== 'GET') {
        response.writeHead(405, { 'Content-Type': 'text/plain' });
        response.write('405 Method Not Allowed');
        response.end();
        return;
    }
    let profileDocument;
    try {
        profileDocument = await dbo.collection('Teamregg').findOne({
            "_id": new ObjectId(nextSegment)
        });
    } catch (e) {
        response.writeHead(404, { 'Content-Type': 'text/plain' });
        response.write('404 Not Found');
        return;
    }

    if (!profileDocument) {
        response.writeHead(404, { 'Content-Type': 'text/plain' });
        response.write('404 Not Found');
        response.end();
        return;
    }

    let template = (await fs.readFile('templates/profile.volvo')).toString();
    template = template.replaceAll('%{profileName}%', cleanupHTMLOutput(profileDocument.teamName));
    template = template.replaceAll('%{profileEmail}%', cleanupHTMLOutput(profileDocument.City));
    template = template.replaceAll('%{profileAge}%', cleanupHTMLOutput(profileDocument.phoneNumber));

    response.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
    response.write(template);
    response.end();
    return;

}