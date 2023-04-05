/**
 * This function maps the controlOptions to an on-screen form and sends
 * changes in the on-screen form to the `setupScene` callback. 
 * 
 * You do not need to understand this code for any part of this class, but
 * its internal comments can help you do so if you are personally interested.
 */
window.addEventListener('load', event=> {
    let c = document.querySelector('#set1')
    // loop over the key:value pairs in the controlOptions object
    Object.entries(controlOptions).forEach(([key,opt]) => {
        // make a radio button in a label for each item
        let r = document.createElement('input')
        r.type = 'radio'
        r.name = 'controlOptions'
        r.value = key
        let l = document.createElement('label')
        l.append(r)
        l.append(' ' + opt.label)
        c.append(l)
        // also listen for the radio button being selected to configure options
        r.addEventListener('change', event => {
            let k = event.target.value
            // erase any options from previous selections
            let d = document.querySelector('#set2')
            while (d.firstChild) d.firstChild.remove()
            // loop over each of the selected item's options
            if (opt.options) Object.entries(opt.options).forEach(([key,opt2]) => {
                if (opt2.type == 'radio') {
                    // if it's a radio-type, it's actually a list of options;
                    Object.entries(opt2.options).forEach(([v,l]) => {
                        // make one radio button and label for option
                        let rb = document.createElement('input')
                        rb.type = 'radio'
                        rb.name = key
                        rb.value = v
                        let lab = document.createElement('label')
                        lab.append(rb)
                        lab.append(l)
                        d.append(lab)
                    })
                    // and select the first radio button by default
                    d.querySelector('input[name="'+key+'"]').click()
                } else {
                    // not a radio, so it's a number, checkbox, or text type
                    // make an appropriate input element and label
                    let num = document.createElement('input')
                    num.type = opt2.type
                    num.name = key
                    num.value = opt2.default // for number, text
                    if (num.value != opt2.default)
                        num.checked = opt2.default // for checkbox
                    num.step = 'any' // for number; ignored otherwise
                    let lab = document.createElement('label')
                    lab.append(num)
                    lab.append(opt2.label)
                    d.append(lab)
                }
            })
        })
    })
    // select the first radio button by default
    c.querySelector('input[type="radio"]').click()
    
    // register a callback for the button too
    let b = document.querySelector('.controls input[type="submit"]')
    b.addEventListener('click', event => {
        event.preventDefault() // don't send the server a POST action
        // retrieve form data
        let form = document.querySelector('form')
        let data = new FormData(form)
        // extract and delete the top-level form item
        let scene = data.get('controlOptions')
        data.delete('controlOptions')
        // copy other content, converting number types and adding defaults as needed
        let options = Object.fromEntries(Array.from(data.entries()).map(([k,v])=>{
            let t = controlOptions[scene].options?.[k]?.['type']
            let d = controlOptions[scene].options?.[k]?.['default']
            if (t == 'number') return [k, Number(v)||d||0]
            if (t == 'checkbox') return [k, v == 'true']
            return [k,v]
        }))
        // add any missing options if they have defaults
        if (controlOptions[scene].options) Object.entries(controlOptions[scene].options).forEach(([k,v])=>{
            if (!(k in options)) {
                 if (v.type == 'checkbox') options[k] = false;
                 else if ('default' in v) options[k] = v.default
            }
        })
        // send the result to the scene generating callback function
        setupScene(scene, options)
    })
})
