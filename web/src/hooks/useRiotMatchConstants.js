import { useEffect, useState } from "react";

export default function useRiotMatchConstants() {
    const [constants , setConstants] = useState([]);

    const fetchConstants = async () => {
        const response = await fetch('https://static.developer.riotgames.com/docs/lol/queues.json');

        if (!response.ok) {
            throw new Error('Failed to fetch constants');
        }

        const responseData = await response.json();

        return responseData.map((data) => {
            let desc = null;

            if(data.description){
                desc = data.description.split(' ');
                if(desc.length > 3){
                    desc = desc[1]+" "+desc[2];
                } else {
                    desc = data.description;
                }
            }

            return {
                queueId: data.queueId,
                map: data.map,
                description: desc,
            }
        });
    }

    useEffect(() => {
        fetchConstants().then(setConstants);
    }, []);

    return constants;
}